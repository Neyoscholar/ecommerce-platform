pipeline {
    agent any
    
    environment {
        // Docker image names and tags
        BACKEND_IMAGE = 'ecommerce-backend'
        FRONTEND_IMAGE = 'ecommerce-frontend'
        REGISTRY = 'localhost:5000' // Change to your registry
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        
        // Node.js versions
        NODE_VERSION = '18'
        
        // Test coverage thresholds
        COVERAGE_THRESHOLD = '70'
    }
    
    options {
        // Discard old builds to save disk space
        buildDiscarder(logRotator(numToKeepStr: '10'))
        
        // Timeout for the entire pipeline
        timeout(time: 30, unit: 'MINUTES')
        
        // Allow pipeline to be aborted
        disableConcurrentBuilds()
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    // Set build description with git info
                    def gitCommit = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    def gitBranch = env.BRANCH_NAME ?: env.GIT_BRANCH
                    currentBuild.description = "Branch: ${gitBranch}, Commit: ${gitCommit}"
                }
            }
        }
        
        stage('Setup Environment') {
            steps {
                script {
                    // Setup Node.js
                    sh 'node --version'
                    sh 'npm --version'
                    
                    // Setup Docker
                    sh 'docker --version'
                    sh 'docker-compose --version'
                }
            }
        }
        
        stage('Install Dependencies') {
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                        }
                    }
                }
                stage('Frontend Dependencies') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                        }
                    }
                }
            }
        }
        
        stage('Code Quality') {
            parallel {
                stage('Backend Linting') {
                    steps {
                        dir('backend') {
                            sh 'npm run lint'
                        }
                    }
                }
                stage('Frontend Linting') {
                    steps {
                        dir('frontend') {
                            sh 'npm run lint'
                        }
                    }
                }
                stage('TypeScript Check') {
                    parallel {
                        stage('Backend Type Check') {
                            steps {
                                dir('backend') {
                                    sh 'npx tsc --noEmit'
                                }
                            }
                        }
                        stage('Frontend Type Check') {
                            steps {
                                dir('frontend') {
                                    sh 'npx tsc --noEmit'
                                }
                            }
                        }
                    }
                }
            }
        }
        
        stage('Run Tests') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        dir('backend') {
                            // Run tests with coverage
                            sh 'npm run test:ci'
                            
                            // Publish test results
                            publishTestResults testResultsPattern: 'backend/coverage/**/*.xml'
                            
                            // Publish coverage report
                            publishCoverage adapters: [
                                lcovAdapter('backend/coverage/lcov.info')
                            ], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                        }
                    }
                    post {
                        always {
                            // Archive test results
                            archiveArtifacts artifacts: 'backend/coverage/**/*'
                        }
                    }
                }
                stage('Frontend Tests') {
                    steps {
                        dir('frontend') {
                            // Run tests if they exist
                            script {
                                if (fileExists('package.json') && sh(script: 'npm run test --if-present', returnStatus: true) == 0) {
                                    sh 'npm run test --if-present'
                                } else {
                                    echo 'No frontend tests configured'
                                }
                            }
                        }
                    }
                }
            }
        }
        
        stage('Build Applications') {
            parallel {
                stage('Build Backend') {
                    steps {
                        dir('backend') {
                            sh 'npm run build'
                            archiveArtifacts artifacts: 'dist/**/*'
                        }
                    }
                }
                stage('Build Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm run build'
                            archiveArtifacts artifacts: 'dist/**/*'
                        }
                    }
                }
            }
        }
        
        stage('Build Docker Images') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                    branch 'develop'
                }
            }
            steps {
                script {
                    // Build backend image
                    sh "docker build -t ${REGISTRY}/${BACKEND_IMAGE}:${IMAGE_TAG} -t ${REGISTRY}/${BACKEND_IMAGE}:latest ./backend"
                    
                    // Build frontend image
                    sh "docker build -t ${REGISTRY}/${FRONTEND_IMAGE}:${IMAGE_TAG} -t ${REGISTRY}/${FRONTEND_IMAGE}:latest ./frontend"
                    
                    // Tag with git commit for traceability
                    def gitCommit = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    sh "docker tag ${REGISTRY}/${BACKEND_IMAGE}:${IMAGE_TAG} ${REGISTRY}/${BACKEND_IMAGE}:${gitCommit}"
                    sh "docker tag ${REGISTRY}/${FRONTEND_IMAGE}:${IMAGE_TAG} ${REGISTRY}/${FRONTEND_IMAGE}:${gitCommit}"
                }
            }
        }
        
        stage('Push Docker Images') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                }
            }
            steps {
                script {
                    // Push to registry (configure credentials in Jenkins)
                    withCredentials([usernamePassword(credentialsId: 'docker-registry', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh "echo ${DOCKER_PASS} | docker login ${REGISTRY} -u ${DOCKER_USER} --password-stdin"
                        
                        sh "docker push ${REGISTRY}/${BACKEND_IMAGE}:${IMAGE_TAG}"
                        sh "docker push ${REGISTRY}/${BACKEND_IMAGE}:latest"
                        sh "docker push ${REGISTRY}/${FRONTEND_IMAGE}:${IMAGE_TAG}"
                        sh "docker push ${REGISTRY}/${FRONTEND_IMAGE}:latest"
                    }
                }
            }
        }
        
        stage('Deploy to Dev Environment') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                }
            }
            steps {
                script {
                    // Deploy using docker-compose
                    sh './deploy/deploy.sh dev'
                }
            }
        }
        
        stage('Load Test (Nightly)') {
            when {
                cron '0 2 * * *' // Run at 2 AM daily
            }
            steps {
                script {
                    // Start the application
                    sh 'docker-compose -f docker-compose.full.yml up -d'
                    
                    // Wait for services to be ready
                    sh 'sleep 30'
                    
                    // Run basic load test
                    sh '''
                        # Simple load test with curl
                        for i in {1..10}; do
                            curl -s http://localhost:4000/healthz > /dev/null
                            curl -s http://localhost:5173 > /dev/null
                            sleep 1
                        done
                        
                        # Capture basic metrics
                        curl -s http://localhost:4000/metrics > metrics.txt
                        curl -s http://localhost:4000/healthz/metrics > health-metrics.txt
                    '''
                    
                    // Archive metrics
                    archiveArtifacts artifacts: '*.txt'
                    
                    // Cleanup
                    sh 'docker-compose -f docker-compose.full.yml down'
                }
            }
        }
    }
    
    post {
        always {
            // Cleanup Docker images to save space
            sh 'docker system prune -f'
            
            // Cleanup workspace
            cleanWs()
        }
        
        success {
            script {
                if (env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'master') {
                    // Notify success for main branch
                    echo "✅ Pipeline completed successfully for ${env.BRANCH_NAME}"
                }
            }
        }
        
        failure {
            script {
                // Notify failure
                echo "❌ Pipeline failed for ${env.BRANCH_NAME}"
                
                // Send notification (configure as needed)
                // emailext (
                //     subject: "Pipeline Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                //     body: "Pipeline failed for ${env.BRANCH_NAME}. Check console output: ${env.BUILD_URL}",
                //     to: "team@example.com"
                // )
            }
        }
        
        unstable {
            script {
                echo "⚠️ Pipeline unstable for ${env.BRANCH_NAME}"
            }
        }
    }
}
