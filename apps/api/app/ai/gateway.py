import asyncio
import hashlib
from typing import TypeVar, Type, Optional, AsyncIterator, List, Dict, Any
from pydantic import BaseModel
from app.ai.contracts import (
    AITaskType,
    ModelRoutePolicy,
    LLMProviderAdapter,
    EmbeddingProviderAdapter,
)
from app.ai.registry import build_default_routing_registry
from app.ai.providers.openai_adapter import OpenAIProviderAdapter
from app.db.supabase_client import supabase_db

T = TypeVar("T", bound=BaseModel)


def build_prompt_cache_key(workspace_id: str, task_type: AITaskType, scope_key: str = "default") -> str:
    """
    Deterministic prompt_cache_key generator for OpenAI Prompt Caching (ADR-021, PR-042).
    """
    raw = f"{workspace_id}:{task_type.value}:{scope_key}"
    return f"dm_{hashlib.sha256(raw.encode('utf-8')).hexdigest()[:32]}"


def format_untrusted_chunk(
    chunk_id: str,
    text_content: str,
    page_number: int = 1,
    doc_title: str = "Document",
    doc_id: Optional[str] = None,
) -> str:
    """
    Wraps extracted document text in <untrusted_document_chunk> XML delimiters (Invariant 7, PR-045)
    to defend against indirect prompt injection embedded in user PDFs.
    """
    safe_text = (text_content or "").replace("</untrusted_document_chunk>", "[/untrusted_document_chunk]")
    doc_attr = f' doc_id="{doc_id}"' if doc_id else ""
    return (
        f'<untrusted_document_chunk chunk_id="{chunk_id}"{doc_attr} '
        f'doc_title="{doc_title}" page_number="{page_number}">\n'
        f"{safe_text}\n"
        f"</untrusted_document_chunk>"
    )


class AIGateway:
    """
    Central Provider-Flexible AI Gateway for DocuMind (ADR-007, ADR-008, ADR-016, ADR-017).
    Routes semantic AITaskTypes to the configured provider adapter (OpenAI by default),
    enforces store=False privacy, handles flex->auto and primary->fallback model failover,
    and records token/cost telemetry in public.ai_usage_logs.
    """

    def __init__(self):
        self._routes: Dict[AITaskType, ModelRoutePolicy] = build_default_routing_registry()
        default_openai = OpenAIProviderAdapter()
        self._llm_providers: Dict[str, LLMProviderAdapter] = {"openai": default_openai}
        self._embedding_providers: Dict[str, EmbeddingProviderAdapter] = {"openai": default_openai}

    def register_provider(
        self,
        name: str,
        llm_adapter: Optional[LLMProviderAdapter] = None,
        embedding_adapter: Optional[EmbeddingProviderAdapter] = None,
    ) -> None:
        if llm_adapter is not None:
            self._llm_providers[name] = llm_adapter
        if embedding_adapter is not None:
            self._embedding_providers[name] = embedding_adapter

    def get_route_policy(self, task_type: AITaskType) -> ModelRoutePolicy:
        return self._routes[task_type]

    @property
    def is_openai_configured(self) -> bool:
        adapter = self._llm_providers.get("openai")
        return bool(getattr(adapter, "is_configured", False))

    def _record_telemetry(
        self,
        *,
        workspace_id: str,
        user_id: Optional[str],
        task_type: AITaskType,
        usage_meta: Dict[str, Any],
    ) -> None:
        if not workspace_id:
            return
        try:
            supabase_db.log_ai_usage(
                {
                    "workspace_id": workspace_id,
                    "user_id": user_id,
                    "task_type": task_type.value,
                    "provider": usage_meta.get("provider", "openai"),
                    "model": usage_meta.get("model", "unknown"),
                    "service_tier": usage_meta.get("service_tier", "auto"),
                    "input_tokens": usage_meta.get("input_tokens", 0),
                    "cached_tokens": usage_meta.get("cached_tokens", 0),
                    "output_tokens": usage_meta.get("output_tokens", 0),
                    "reasoning_tokens": usage_meta.get("reasoning_tokens", 0),
                    "estimated_cost_usd": usage_meta.get("estimated_cost_usd", 0.0),
                    "latency_ms": usage_meta.get("latency_ms", 0),
                }
            )
        except Exception as e:
            print(f"[AIGateway] Telemetry log warning: {e}")

    async def generate_structured(
        self,
        *,
        task_type: AITaskType,
        workspace_id: str,
        user_id: Optional[str] = None,
        instructions: str,
        input_blocks: List[Dict[str, Any]] | str,
        response_model: Type[T],
        scope_key: str = "default",
    ) -> T:
        policy = self.get_route_policy(task_type)
        cache_key = build_prompt_cache_key(workspace_id, task_type, scope_key)

        attempts = [
            (policy.primary_provider, policy.primary_model, policy.service_tier),
        ]
        if policy.service_tier == "flex":
            attempts.append((policy.primary_provider, policy.primary_model, "auto"))
        if policy.fallback_model and policy.fallback_model != policy.primary_model:
            attempts.append((policy.fallback_provider, policy.fallback_model, "auto"))

        last_err: Optional[Exception] = None
        for idx, (provider_name, model_name, tier) in enumerate(attempts):
            adapter = self._llm_providers.get(provider_name) or self._llm_providers["openai"]
            try:
                parsed, usage_meta = await adapter.generate_structured(
                    model=model_name,
                    instructions=instructions,
                    input_blocks=input_blocks,
                    response_model=response_model,
                    reasoning_effort=policy.reasoning_effort,
                    service_tier=tier,
                    prompt_cache_key=cache_key,
                    store=False,
                )
                self._record_telemetry(
                    workspace_id=workspace_id,
                    user_id=user_id,
                    task_type=task_type,
                    usage_meta=usage_meta,
                )
                return parsed
            except Exception as err:
                last_err = err
                if idx < len(attempts) - 1:
                    await asyncio.sleep(0.6 * (idx + 1))

        raise RuntimeError(f"AIGateway.generate_structured failed for {task_type.value}: {last_err}") from last_err

    async def generate_text(
        self,
        *,
        task_type: AITaskType,
        workspace_id: str,
        user_id: Optional[str] = None,
        instructions: str,
        input_blocks: List[Dict[str, Any]] | str,
        scope_key: str = "default",
    ) -> str:
        policy = self.get_route_policy(task_type)
        cache_key = build_prompt_cache_key(workspace_id, task_type, scope_key)

        attempts = [
            (policy.primary_provider, policy.primary_model, policy.service_tier),
            (policy.fallback_provider, policy.fallback_model, "auto"),
        ]
        last_err: Optional[Exception] = None
        for idx, (provider_name, model_name, tier) in enumerate(attempts):
            adapter = self._llm_providers.get(provider_name) or self._llm_providers["openai"]
            try:
                text_out, usage_meta = await adapter.generate_text(
                    model=model_name,
                    instructions=instructions,
                    input_blocks=input_blocks,
                    reasoning_effort=policy.reasoning_effort,
                    service_tier=tier,
                    prompt_cache_key=cache_key,
                    store=False,
                )
                self._record_telemetry(
                    workspace_id=workspace_id,
                    user_id=user_id,
                    task_type=task_type,
                    usage_meta=usage_meta,
                )
                return text_out
            except Exception as err:
                last_err = err
                if idx < len(attempts) - 1:
                    await asyncio.sleep(0.5)

        raise RuntimeError(f"AIGateway.generate_text failed for {task_type.value}: {last_err}") from last_err

    async def stream_text(
        self,
        *,
        task_type: AITaskType,
        workspace_id: str,
        user_id: Optional[str] = None,
        instructions: str,
        input_blocks: List[Dict[str, Any]] | str,
        scope_key: str = "default",
    ) -> AsyncIterator[str]:
        policy = self.get_route_policy(task_type)
        cache_key = build_prompt_cache_key(workspace_id, task_type, scope_key)
        adapter = self._llm_providers.get(policy.primary_provider) or self._llm_providers["openai"]

        async for item in adapter.stream_text(
            model=policy.primary_model,
            instructions=instructions,
            input_blocks=input_blocks,
            reasoning_effort=policy.reasoning_effort,
            prompt_cache_key=cache_key,
            store=False,
        ):
            if item.get("type") == "token_delta":
                yield item["delta"]
            elif item.get("type") == "usage" and item.get("usage"):
                self._record_telemetry(
                    workspace_id=workspace_id,
                    user_id=user_id,
                    task_type=task_type,
                    usage_meta=item["usage"],
                )

    async def embed_texts(
        self,
        *,
        texts: List[str],
        workspace_id: str,
        user_id: Optional[str] = None,
        is_query: bool = False,
    ) -> List[List[float]]:
        task_type = AITaskType.EMBEDDING_QUERY if is_query else AITaskType.EMBEDDING_DOCUMENT
        policy = self.get_route_policy(task_type)
        adapter = self._embedding_providers.get(policy.primary_provider) or self._embedding_providers["openai"]

        vectors, usage_meta = await adapter.embed_texts(
            model=policy.primary_model,
            texts=texts,
            dimensions=policy.dimensions or 1536,
        )
        self._record_telemetry(
            workspace_id=workspace_id,
            user_id=user_id,
            task_type=task_type,
            usage_meta=usage_meta,
        )
        return vectors


ai_gateway = AIGateway()
