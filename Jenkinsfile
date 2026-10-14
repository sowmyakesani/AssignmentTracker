pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Source code is checked out from the configured GitHub repository.'
                checkout scm
            }
        }

        stage('Build and Test with Maven') {
            steps {
                bat 'mvn -B clean verify'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t student-assignment-tracker:%BUILD_NUMBER% .'
                bat 'docker tag student-assignment-tracker:%BUILD_NUMBER% student-assignment-tracker:latest'
            }
        }

        stage('Deploy to Kubernetes') {
            when {
                expression { return params.DEPLOY_TO_K8S == true }
            }
            steps {
                bat 'kubectl apply -f k8s/'
                bat 'kubectl rollout status deployment/student-assignment-tracker --timeout=120s'
            }
        }
    }

    parameters {
        booleanParam(
            name: 'DEPLOY_TO_K8S',
            defaultValue: false,
            description: 'Enable only after Jenkins can access the intended Kubernetes cluster and the image is available to that cluster.'
        )
    }

    post {
        success {
            echo 'Pipeline succeeded: Maven tests passed and Docker image was built.'
        }
        failure {
            echo 'Pipeline failed. Review the stage console output and fix the reported error.'
        }
    }
}
