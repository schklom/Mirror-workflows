pipeline {
    agent any

    stages {
        stage('phpunit') {
            steps {
                sh """
                docker run --rm \
                    --volumes-from jenkins-docker_app_1 \
                    --workdir ${env.WORKSPACE} \
                    php:8.1-cli \
                    php ./vendor/bin/phpunit
                """
            }
        }
        stage('phpstan') {
            steps {
                sh """
                # php -d memory_limit=-1 ....
                docker run --rm \
                    --volumes-from jenkins-docker_app_1 \
                    --workdir ${env.WORKSPACE} \
                    php:8.1-cli \
                    php -d memory_limit=-1 ./vendor/bin/phpstan --memory-limit=2G
                """
            }
        }
    }
}
