# Multi-stage build for backend
# Stage 1: Builder
FROM maven:3.9-eclipse-temurin-21 as builder

WORKDIR /build
COPY apps/backend/pom.xml .
COPY apps/backend/src ./src

# Cache dependencies layer
RUN mvn dependency:go-offline -B

# Build application
RUN mvn clean package -DskipTests -q

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

LABEL maintainer="DevOps Team"
LABEL description="ECOTEL Backend Application - Spring Boot 4.0.6"
LABEL version="1.0.0"

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user for security
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

WORKDIR /app

# Copy JAR from builder stage
COPY --from=builder --chown=appuser:appuser /build/target/*.jar app.jar

# Create directory for logs
RUN mkdir -p /app/logs && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run application with optimized JVM settings
CMD ["java", \
     "-XX:+UseG1GC", \
     "-XX:MaxGCPauseMillis=200", \
     "-XX:InitiatingHeapOccupancyPercent=35", \
     "-XX:+ParallelRefProcEnabled", \
     "-XX:+UnlockExperimentalVMOptions", \
     "-XX:G1NewCollectionHeuristicPercent=20", \
     "-XX:+HeapDumpOnOutOfMemoryError", \
     "-XX:HeapDumpPath=/app/logs/heap-dump.hprof", \
     "-Dcom.sun.management.jmxremote=true", \
     "-Dcom.sun.management.jmxremote.port=9010", \
     "-Dcom.sun.management.jmxremote.rmi.port=9010", \
     "-Dcom.sun.management.jmxremote.local.only=false", \
     "-Djava.rmi.server.hostname=127.0.0.1", \
     "-jar", "app.jar"]
