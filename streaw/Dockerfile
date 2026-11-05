# Etapa 1: Compilar o projeto com o Maven
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /app

# Copia primeiro apenas os arquivos de configuração de dependências para aproveitar o cache do Docker
COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# Dá permissão ao Maven Wrapper e baixa as dependências (evita rebaixar tudo a cada alteração de código)
RUN chmod +x mvnw && ./mvnw dependency:go-offline

# Copia o código-fonte restante
COPY src/ src/

# Compila o projeto
RUN ./mvnw clean package -DskipTests

# Etapa 2: Executar a aplicação
FROM eclipse-temurin:25-jdk-alpine
WORKDIR /app

# Cria um usuário não-root para maior segurança na execução
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copia o JAR gerado na etapa anterior
COPY --from=build /app/target/streaw-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
