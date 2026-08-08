# 🔄 ArgoCD GitOps Continuous Deployment Guide

This project is configured with a complete **GitOps CI/CD pipeline** using **GitHub Actions** and **ArgoCD**. Any code pushed to the `main` branch automatically triggers container builds, image registry updates, and continuous deployment to your Kubernetes cluster.

---

## 🏗️ Architecture Overview

```
[ Developer Git Push to main ]
             │
             ▼
[ GitHub Actions Workflow (.github/workflows/ci-cd.yml) ]
   ├── 1. Runs unit & build checks
   ├── 2. Builds Docker images for Backend & Frontend
   ├── 3. Pushes images to GitHub Container Registry (ghcr.io)
   └── 4. Updates image tags in `k8s/backend/deployment.yaml` & `k8s/frontend/deployment.yaml`
             │
             ▼
[ Git Repository Updated with New Image Commit SHA ]
             │
             ▼
[ ArgoCD (GitOps Controller in Kubernetes) ]
   ├── 1. Detects commit change in `k8s/` directory
   ├── 2. Compares cluster state with desired state in Git
   └── 3. Performs zero-downtime rolling update on K8s pods automatically!
```

---

## 🚀 Setup Instructions

### Step 1: Install ArgoCD in Your Kubernetes Cluster

Run the following commands to install ArgoCD:

```bash
# Create namespace for ArgoCD
kubectl create namespace argocd

# Apply official ArgoCD installation manifests
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Wait until all ArgoCD pods are running:
```bash
kubectl get pods -n argocd
```

---

### Step 2: Access the ArgoCD Web UI

1. Forward port `8080` to the ArgoCD server:
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```
2. Open your browser and navigate to `https://localhost:8080`.

3. Retrieve the initial admin password:
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_))
```
* **Username**: `admin`
* **Password**: *(output from above command)*

---

### Step 3: Connect ArgoCD to the Project (GitOps Sync)

Apply the pre-configured ArgoCD Application manifest:

```bash
kubectl apply -f k8s/argocd/application.yaml
```

ArgoCD will now start tracking the `k8s/` folder in your repository and will automatically keep your cluster state in sync with Git!

---

## ⚡ How the Automated Pipeline Works

1. **Push Changes**: Edit code in `backend/` or `frontend/` and push to `main`.
2. **Automated Docker Build**: GitHub Actions builds container images and pushes them to `ghcr.io`.
3. **Automated Manifest Update**: GitHub Actions updates the image tags in `k8s/backend/deployment.yaml` and `k8s/frontend/deployment.yaml` with `${{ github.sha }}`.
4. **Automated Deployment**: ArgoCD notices the tag change in Git and automatically syncs the new pods into the cluster with zero downtime.
