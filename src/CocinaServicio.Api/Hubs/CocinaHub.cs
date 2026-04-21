using Microsoft.AspNetCore.SignalR;

namespace CocinaServicio.Api.Hubs;

public class CocinaHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Connected", new { connectionId = Context.ConnectionId });
        await base.OnConnectedAsync();
    }
}
