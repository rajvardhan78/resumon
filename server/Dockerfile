# ── Build ─────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore in its own layer so it is only re-run when a project file actually changes.
COPY Resumon.slnx ./
COPY src/Resumon.Api/Resumon.Api.csproj src/Resumon.Api/
COPY tests/Resumon.Api.Tests/Resumon.Api.Tests.csproj tests/Resumon.Api.Tests/
RUN dotnet restore Resumon.slnx

COPY . .
RUN dotnet publish src/Resumon.Api/Resumon.Api.csproj -c Release -o /app/publish --no-restore

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Render injects PORT and Program.cs binds to it; 8080 keeps a plain `docker run` working.
ENV ASPNETCORE_ENVIRONMENT=Production \
    PORT=8080
EXPOSE 8080

# The aspnet image ships a non-root `app` user — there is nothing here that needs root.
USER app

ENTRYPOINT ["dotnet", "Resumon.Api.dll"]
