# GDG RVCE – The Turing Test

The Turing Test is a real-time multiplayer event software for a Student Induction Program event conducted at RV College of Engineering. The system comfortably scales up to 300-500 concurrent participants dynamically with a complete real-time WebSocket connection to facilitate multiplayer features like leaderboards, round timers, notifications, etc.

## 🚀 Getting Started

### Local Development (Docker Compose)
For local development, you can use the provided Docker Compose file to easily spin up the environment (Backend + Frontend + Redis).

```bash
# 1. Clone the repository
git clone <repository_url>

# 2. Start the development environment via Docker Compose
docker-compose up --build -d
```
The Frontend will be available on `http://localhost:5173` and the Backend API on `http://localhost:3000`.

### Kubernetes Production Deployment

The project contains the complete production-ready Kubernetes infrastructure. Ensure you have a K8s cluster running (e.g., Minikube, EKS, GKE, AKS) and `kubectl` configured. 

#### 1. Build and Load Docker Images
If using a local K8s cluster like Minikube, build the images and load them. For managed clusters, push images to a Container Registry.
```bash
docker build -t turing-test-backend:latest ./backend
docker build -t turing-test-frontend:latest ./frontend
```

#### 2. Create the Namespace
```bash
kubectl apply -f k8s/namespace/namespace.yaml
```

#### 3. Apply ConfigMaps and Secrets
Edit `k8s/secrets/secrets.yaml` with your actual sensitive configurations before applying.
```bash
kubectl apply -f k8s/configmaps/configmap.yaml
kubectl apply -f k8s/secrets/secrets.yaml
```

#### 4. Deploy Redis (StatefulSet)
```bash
kubectl apply -f k8s/redis/statefulset.yaml
kubectl apply -f k8s/redis/service.yaml
```

#### 5. Deploy Backend and Frontend
```bash
kubectl apply -f k8s/backend/deployment.yaml
kubectl apply -f k8s/backend/service.yaml
kubectl apply -f k8s/backend/hpa.yaml

kubectl apply -f k8s/frontend/deployment.yaml
kubectl apply -f k8s/frontend/service.yaml
```

#### 6. Apply Ingress Controller
Ensure your cluster has an NGINX Ingress Controller installed. Then run:
```bash
kubectl apply -f k8s/ingress/ingress.yaml
```
For local testing, add `127.0.0.1 turing-test.local` to your local `/etc/hosts` file and access via `http://turing-test.local`.

## 🛠 Tech Stack
* **Frontend:** React, Vite, Tailwind CSS, Socket.IO Client.
* **Backend:** Node.js, Express, Socket.IO, Redis (as Primary DB).
* **Infrastructure:** Docker, Kubernetes (StatefulSets, Deployments, HPA, ConfigMaps, Ingress, Services, Secrets).

## 🔒 Admin Information
During initial bootstrap, an admin account is automatically seeded into Redis.
**Username:** `A`
**Password:** `a`