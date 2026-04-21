var builder = DistributedApplication.CreateBuilder(args);

builder.AddProject<Projects.CocinaServicio_Api>("api")
       .WithExternalHttpEndpoints();

builder.Build().Run();
