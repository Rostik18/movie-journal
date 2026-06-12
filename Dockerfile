FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["movie-journal-backend/src/MovieJournalBackend.csproj", "movie-journal-backend/src/"]

RUN dotnet restore "movie-journal-backend/src/MovieJournalBackend.csproj"

COPY . .

WORKDIR "/src/movie-journal-backend/src"
RUN dotnet publish "MovieJournalBackend.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "MovieJournalBackend.dll"]