"""
Main client for AI-Agent Mesh Python SDK
"""

from typing import Dict, List, Optional, Any
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .models import Agent, Workflow, Policy, TelemetryEvent
from .exceptions import (
    AgentMeshError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    NotFoundError,
)


class AgentMeshClient:
    """
    Main client for interacting with AI-Agent Mesh platform.
    
    Args:
        api_key: Your AI-Agent Mesh API key
        base_url: Base URL for the API (defaults to production)
        timeout: Request timeout in seconds
        max_retries: Maximum number of retry attempts
        
    Example:
        >>> client = AgentMeshClient(api_key="sk_...", timeout=30)
        >>> agents = client.agents.list()
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.ai-agent-mesh.com/v3",
        timeout: int = 30,
        max_retries: int = 3,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        
        # Set up session with retry logic
        self.session = requests.Session()
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set default headers
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-SDK-Version": "3.0.0",
            "X-SDK-Language": "python",
        })
        
        # Initialize resource managers
        self.agents = AgentManager(self)
        self.workflows = WorkflowManager(self)
        self.policies = PolicyManager(self)
        self.telemetry = TelemetryManager(self)
        self.federation = FederationManager(self)
        self.marketplace = MarketplaceManager(self)
        self.account = AccountManager(self)
    
    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        json: Optional[Dict] = None,
    ) -> Any:
        """Make an HTTP request to the API"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=json,
                timeout=self.timeout,
            )
            
            # Handle error responses
            if response.status_code == 401:
                raise AuthenticationError("Invalid API key")
            elif response.status_code == 404:
                raise NotFoundError(f"Resource not found: {endpoint}")
            elif response.status_code == 429:
                raise RateLimitError("Rate limit exceeded")
            elif response.status_code >= 400:
                error_data = response.json() if response.content else {}
                raise AgentMeshError(
                    f"API error: {error_data.get('message', response.text)}"
                )
            
            # Return JSON response if available
            if response.content:
                return response.json()
            return None
            
        except requests.RequestException as e:
            raise AgentMeshError(f"Request failed: {str(e)}")


class AgentManager:
    """Manager for agent-related operations"""
    
    def __init__(self, client: AgentMeshClient):
        self.client = client
    
    def create(
        self,
        name: str,
        type: str,
        config: Dict[str, Any],
        status: str = "active",
    ) -> Agent:
        """Create a new agent"""
        data = self.client._request(
            "POST",
            "/agents",
            json={"name": name, "type": type, "config": config, "status": status},
        )
        return Agent(**data)
    
    def get(self, agent_id: str) -> Agent:
        """Get agent by ID"""
        data = self.client._request("GET", f"/agents/{agent_id}")
        return Agent(**data)
    
    def list(
        self,
        status: Optional[str] = None,
        type: Optional[str] = None,
        limit: int = 100,
    ) -> List[Agent]:
        """List all agents"""
        params = {"limit": limit}
        if status:
            params["status"] = status
        if type:
            params["type"] = type
        
        data = self.client._request("GET", "/agents", params=params)
        return [Agent(**agent) for agent in data]
    
    def update(self, agent_id: str, **kwargs) -> Agent:
        """Update an agent"""
        data = self.client._request("PATCH", f"/agents/{agent_id}", json=kwargs)
        return Agent(**data)
    
    def delete(self, agent_id: str) -> None:
        """Delete an agent"""
        self.client._request("DELETE", f"/agents/{agent_id}")


class WorkflowManager:
    """Manager for workflow-related operations"""
    
    def __init__(self, client: AgentMeshClient):
        self.client = client
    
    def create(self, agent_id: str, definition: Dict[str, Any]) -> Workflow:
        """Create a workflow"""
        data = self.client._request(
            "POST",
            "/workflows",
            json={"agent_id": agent_id, "definition": definition},
        )
        return Workflow(**data)
    
    def execute(self, workflow_id: str, input: Optional[Dict] = None) -> Any:
        """Execute a workflow"""
        return self.client._request(
            "POST",
            f"/workflows/{workflow_id}/execute",
            json={"input": input or {}},
        )
    
    def get_history(self, workflow_id: str, limit: int = 100) -> List[Dict]:
        """Get workflow execution history"""
        return self.client._request(
            "GET",
            f"/workflows/{workflow_id}/history",
            params={"limit": limit},
        )


class PolicyManager:
    """Manager for policy-related operations"""
    
    def __init__(self, client: AgentMeshClient):
        self.client = client
    
    def apply(
        self,
        agent_id: str,
        name: str,
        framework: str,
        rules: Dict[str, Any],
        enforcement_mode: str = "monitor",
    ) -> Policy:
        """Apply a governance policy to an agent"""
        data = self.client._request(
            "POST",
            f"/agents/{agent_id}/policies",
            json={
                "name": name,
                "framework": framework,
                "rules": rules,
                "enforcement_mode": enforcement_mode,
            },
        )
        return Policy(**data)
    
    def list(self, agent_id: str) -> List[Policy]:
        """List policies for an agent"""
        data = self.client._request("GET", f"/agents/{agent_id}/policies")
        return [Policy(**policy) for policy in data]
    
    def check_compliance(self, agent_id: str) -> Dict[str, Any]:
        """Check policy compliance for an agent"""
        return self.client._request("POST", f"/agents/{agent_id}/compliance/check")


class TelemetryManager:
    """Manager for telemetry-related operations"""
    
    def __init__(self, client: AgentMeshClient):
        self.client = client
    
    def get(
        self,
        agent_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        event_type: Optional[str] = None,
    ) -> List[TelemetryEvent]:
        """Get telemetry events for an agent"""
        params = {}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        if event_type:
            params["event_type"] = event_type
        
        data = self.client._request("GET", f"/agents/{agent_id}/telemetry", params=params)
        return [TelemetryEvent(**event) for event in data]
    
    def get_health(self, agent_id: str) -> Dict[str, Any]:
        """Get agent health metrics"""
        return self.client._request("GET", f"/agents/{agent_id}/health")


class FederationManager:
    """Manager for federation-related operations"""
    
    def __init__(self, client: AgentMeshClient):
        self.client = client
    
    def discover(
        self,
        capabilities: Optional[List[str]] = None,
        region: Optional[str] = None,
    ) -> List[Agent]:
        """Discover agents in the mesh"""
        params = {}
        if capabilities:
            params["capabilities"] = ",".join(capabilities)
        if region:
            params["region"] = region
        
        data = self.client._request("GET", "/federation/discover", params=params)
        return [Agent(**agent) for agent in data]
    
    def register(self, agent_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Register agent with federation"""
        return self.client._request(
            "POST",
            f"/federation/register/{agent_id}",
            json=config,
        )


class MarketplaceManager:
    """Manager for marketplace operations"""
    
    def __init__(self, client: AgentMeshClient):
        self.client = client
    
    def browse(
        self,
        category: Optional[str] = None,
        framework: Optional[str] = None,
    ) -> List[Dict]:
        """Browse policy marketplace"""
        params = {}
        if category:
            params["category"] = category
        if framework:
            params["framework"] = framework
        
        return self.client._request("GET", "/marketplace/policies", params=params)
    
    def install(self, policy_id: str, agent_id: str) -> Policy:
        """Install a policy from marketplace"""
        data = self.client._request(
            "POST",
            f"/marketplace/policies/{policy_id}/install",
            json={"agent_id": agent_id},
        )
        return Policy(**data)


class AccountManager:
    """Manager for account-related operations"""
    
    def __init__(self, client: AgentMeshClient):
        self.client = client
    
    def get_usage(self) -> Dict[str, Any]:
        """Get current account usage"""
        return self.client._request("GET", "/account/usage")
    
    def get_limits(self) -> Dict[str, Any]:
        """Get account limits"""
        return self.client._request("GET", "/account/limits")
