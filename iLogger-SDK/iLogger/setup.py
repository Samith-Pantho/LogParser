from setuptools import setup, find_packages

setup(
    name="iLogger",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "requests",
    ],
    author="Samith Pantho",
    description="A custom logging SDK.",
)
