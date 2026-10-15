pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    parameters {
        booleanParam(
            name: 'DEPLOY_TO_K8S',
            defaultValue: false,
            description: 'Enable only after Kubernetes access and image availability are configured.'
        )
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code from GitHub.'
                checkout scm
            }
        }

        stage('Build and Test with Maven') {
            steps {
                sh 'mvn -B clean test package'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t student-assignment-tracker:${BUILD_NUMBER} .'
                sh 'docker tag student-assignment-tracker:${BUILD_NUMBER} student-assignment-tracker:latest'
            }
        }

        stage('Deploy to Kubernetes') {
            when {
                expression {
                    return params.DEPLOY_TO_K8S == true
                }
            }
            steps {
                sh 'kubectl apply -f k8s/'
                sh 'kubectl rollout status deployment/student-assignment-tracker --timeout=120s'
            }
        }
    }

    post {
        success {
            echo 'Pipeline succeeded: Maven build and tests passed, and the Docker image was built.'
        }
        failure {
            echo 'Pipeline failed. Check Console Output for the first error.'
        }
    }
}