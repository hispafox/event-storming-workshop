var builder = DistributedApplication.CreateBuilder(args);

var api = builder.AddProject<Projects.CocinaServicio_Api>("api")
                 .WithExternalHttpEndpoints();

builder.AddNpmApp("web", "../../src/CocinaServicio.Web", "dev")
       .WithReference(api)
       .WithEnvironment("VITE_API_URL", api.GetEndpoint("http"))
       .WithHttpEndpoint(env: "PORT")
       .WithExternalHttpEndpoints();

builder.Build().Run();
