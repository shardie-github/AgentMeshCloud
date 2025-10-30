from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="ai-agent-mesh",
    version="3.0.0",
    author="AI-Agent Mesh Team",
    author_email="sdk@ai-agent-mesh.com",
    description="Official Python SDK for AI-Agent Mesh platform",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/ai-agent-mesh/sdk-python",
    project_urls={
        "Bug Tracker": "https://github.com/ai-agent-mesh/sdk-python/issues",
        "Documentation": "https://docs.ai-agent-mesh.com/sdk/python",
        "Source Code": "https://github.com/ai-agent-mesh/sdk-python",
    },
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.31.0",
        "pydantic>=2.5.0",
        "python-dateutil>=2.8.2",
        "typing-extensions>=4.8.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.1.0",
            "black>=23.0.0",
            "isort>=5.12.0",
            "mypy>=1.7.0",
            "flake8>=6.1.0",
        ],
        "async": [
            "aiohttp>=3.9.0",
            "asyncio>=3.4.3",
        ],
    },
    keywords=[
        "ai",
        "agent",
        "orchestration",
        "mcp",
        "mesh",
        "governance",
        "compliance",
        "machine-learning",
    ],
)
