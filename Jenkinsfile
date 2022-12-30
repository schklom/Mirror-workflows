pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '5'))
    }

    stages {
        stage('phpunit') {
            steps {
                sh """
                docker run --rm \
                    --workdir /app \
                    -v ${env.WORKSPACE}:/app \
                    registry.fakecake.org/php:8.1-cli \
                    php ./vendor/bin/phpunit
                """
            }
        }
        stage('phpstan') {
            steps {
                sh """
                # php -d memory_limit=-1 ....
                docker run --rm \
                    --workdir /app \
                    -v ${env.WORKSPACE}:/app \
                    registry.fakecake.org/php:8.1-cli \
                    php -d memory_limit=-1 ./vendor/bin/phpstan --memory-limit=2G
                """
            }
        }
    }
}
