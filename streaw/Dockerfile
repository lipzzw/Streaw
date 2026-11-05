# Etapa 1: Compilar o projeto com o Maven (Java 21)
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY . .

# Dá permissão de execução ao Maven Wrapper
RUN chmod +x mvnw

# Compila o projeto
RUN ./mvnw clean package -DskipTests

# Etapa 2: Executar a aplicação
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
COPY --from=build /app/target/streaw-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
