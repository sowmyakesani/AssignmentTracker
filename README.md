# Student Assignment Tracker — DevOps Project

A modern responsive assignment dashboard served by a Java Spring Boot application. The frontend uses HTML/CSS/JavaScript and browser LocalStorage; Spring Boot provides the application runtime and a health endpoint.

## Architecture
- Git + GitHub: version control and remote source repository
- Maven: compile, test, and package the Java application
- Jenkins: pipeline for checkout, Maven verification, Docker image build, optional Kubernetes rollout
- Docker: multi-stage container build
- Kubernetes: Deployment with 2 replicas, NodePort Service, readiness/liveness probes

## Prerequisites
- JDK 21
- Apache Maven 3.9+
- Git
- Docker Desktop
- Jenkins with Pipeline support and access to Maven, Docker CLI/daemon, Git, and (for deployment) kubectl
- Kubernetes cluster enabled in Docker Desktop, or Minikube

## Run locally
```powershell
mvn -B clean verify
mvn spring-boot:run
```
Open http://localhost:8080 and health endpoint http://localhost:8080/api/health.

## Build and run Docker
```powershell
docker build -t student-assignment-tracker:latest .
docker run --rm -p 8080:8080 student-assignment-tracker:latest
```
Open http://localhost:8080.

## Git and GitHub
Create an empty repository on GitHub, then run in this folder:
```powershell
git init
git add .
git commit -m "Add Student Assignment Tracker DevOps pipeline"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/student-assignment-tracker.git
git push -u origin main
```
Replace `YOUR-USERNAME` with your GitHub username.

## Jenkins setup
1. Install/start Jenkins and open http://localhost:8080 (unless you configured another port).
2. Install/enable Pipeline and Git plugins if not already present.
3. Configure a JDK installation and Maven installation under Manage Jenkins > Tools if you plan to use Jenkins-managed tools. This Jenkinsfile calls `mvn`, `docker`, and optionally `kubectl` from the agent's PATH.
4. Create a Pipeline job, choose "Pipeline script from SCM", select Git, enter your GitHub repository URL and branch `*/main`, and set Script Path to `Jenkinsfile`.
5. Run Build Now. Maven tests should run before Docker image creation.

Important: Jenkins running as a Windows service may use a different Windows account and PATH from your interactive terminal. Ensure the service account can run `mvn`, `docker`, and `kubectl`, and can access the Docker daemon. Restart Jenkins after changing system PATH.

## Kubernetes deployment (local cluster)
Enable Kubernetes in Docker Desktop settings and wait until the cluster is running. Ensure `kubectl` points to the intended cluster:
```powershell
kubectl config current-context
kubectl get nodes
```
Build the image locally:
```powershell
docker build -t student-assignment-tracker:latest .
```
If using Docker Desktop's built-in Kubernetes, it can generally use images built in Docker Desktop's image store. If using Minikube instead, run:
```powershell
minikube image load student-assignment-tracker:latest
```
Apply the Kubernetes manifests:
```powershell
kubectl apply -f k8s/
kubectl get deployments
kubectl get pods
kubectl get services
kubectl rollout status deployment/student-assignment-tracker
```
Open http://localhost:30080 if the selected cluster exposes its NodePort locally. Otherwise use:
```powershell
kubectl port-forward service/student-assignment-tracker 8081:8080
```
Then open http://localhost:8081.

## Jenkins Kubernetes stage notes
The Jenkinsfile's Kubernetes stage is optional and disabled by default. Enable `DEPLOY_TO_K8S` only after the Jenkins agent has a valid Kubernetes context and the cluster can access the built image. For a remote cluster, push the image to a registry (such as Docker Hub), update `k8s/deployment.yaml` to use the registry image, configure credentials securely in Jenkins, and ensure the cluster can pull it. Do not store registry passwords or kubeconfig credentials in the repository.

## Important limitation
Assignments currently use browser LocalStorage and do not sync across devices. A backend database can be added as a future improvement.
