"""
Custom exceptions for AI-Agent Mesh SDK
"""


class AgentMeshError(Exception):
    """Base exception for all SDK errors"""
    pass


class AuthenticationError(AgentMeshError):
    """Raised when API key is invalid or missing"""
    pass


class RateLimitError(AgentMeshError):
    """Raised when API rate limit is exceeded"""
    pass


class ValidationError(AgentMeshError):
    """Raised when request validation fails"""
    pass


class NotFoundError(AgentMeshError):
    """Raised when a resource is not found"""
    pass


class NetworkError(AgentMeshError):
    """Raised when a network error occurs"""
    pass
