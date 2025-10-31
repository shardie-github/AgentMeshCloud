# ORCA OPA Security Policies
# 
# Enforces RBAC, data retention, privacy, and quotas
# Used in CI/CD gates and runtime authorization

package orca.security

import future.keywords.in

# Default deny
default allow = false

# RBAC Rules
allow {
    input.method == "GET"
    input.path == "/health"
}

allow {
    input.method == "GET"
    input.path == "/status"
}

allow {
    user_has_permission(input.user, input.path, input.method)
}

user_has_permission(user, path, method) {
    role := user_roles[user.id][_]
    permission := role_permissions[role][_]
    matches_permission(permission, path, method)
}

user_roles := {
    "admin": ["admin"],
    "engineer": ["engineer", "viewer"],
    "viewer": ["viewer"],
}

role_permissions := {
    "admin": [
        {"path": "/api/*", "methods": ["GET", "POST", "PUT", "DELETE"]},
        {"path": "/admin/*", "methods": ["GET", "POST", "PUT", "DELETE"]},
    ],
    "engineer": [
        {"path": "/api/*", "methods": ["GET", "POST", "PUT"]},
        {"path": "/api/agents", "methods": ["DELETE"]},
    ],
    "viewer": [
        {"path": "/api/*", "methods": ["GET"]},
    ],
}

matches_permission(permission, path, method) {
    glob.match(permission.path, ["/"], path)
    method in permission.methods
}

# Data Classification Rules
classify_data(data) = classification {
    contains_pii(data)
    classification := "sensitive"
} else = classification {
    contains_financial(data)
    classification := "confidential"
} else = classification {
    classification := "public"
}

contains_pii(data) {
    data.email
}

contains_pii(data) {
    data.ssn
}

contains_financial(data) {
    data.credit_card
}

# Data Retention Rules
retention_valid(data) {
    data.retention_days <= max_retention_days(data.classification)
}

max_retention_days("public") = 365
max_retention_days("confidential") = 90
max_retention_days("sensitive") = 30

# Privacy Rules (GDPR/CCPA)
privacy_compliant(operation) {
    operation.type == "delete"
    operation.reason in ["user_request", "retention_expired"]
}

privacy_compliant(operation) {
    operation.type == "export"
    user_consented(operation.user_id)
}

user_consented(user_id) {
    # Check consent database
    true  # Simplified for example
}

# Rate Limiting / Quotas
within_quota(user, resource) {
    usage := user_usage[user.id][resource]
    quota := user_quota[user.id][resource]
    usage < quota
}

user_quota := {
    "free_tier": {
        "api_calls_per_day": 1000,
        "agents_max": 10,
        "workflows_max": 5,
    },
    "pro_tier": {
        "api_calls_per_day": 50000,
        "agents_max": 100,
        "workflows_max": 50,
    },
    "enterprise": {
        "api_calls_per_day": 1000000,
        "agents_max": 10000,
        "workflows_max": 1000,
    },
}

# Breaking Change Detection
breaking_change(api_change) {
    api_change.type == "removed_endpoint"
}

breaking_change(api_change) {
    api_change.type == "changed_response_schema"
    api_change.field_removed == true
}

breaking_change(api_change) {
    api_change.type == "changed_parameter"
    api_change.required_added == true
}

# Deployment Gates
deployment_allowed(deployment) {
    deployment.tests_passed == true
    deployment.security_scan_passed == true
    not breaking_change_without_approval(deployment)
}

breaking_change_without_approval(deployment) {
    deployment.has_breaking_changes == true
    not deployment.approved_by_lead == true
}

# Audit Requirements
audit_required(operation) {
    operation.resource in ["agents", "workflows", "trust_scores"]
    operation.method in ["POST", "PUT", "DELETE"]
}

audit_required(operation) {
    classify_data(operation.data) in ["sensitive", "confidential"]
}
