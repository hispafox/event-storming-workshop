using System.Collections.Concurrent;

namespace CocinaServicio.Api.Demo;

public interface IFailureInjector
{
    void InyectarFalloProximoFlujo(string step, string failureType);
    bool DebeFallar(string step, out string failureType);
    void Consumir(string step);
}

public class FailureInjector : IFailureInjector
{
    private readonly ConcurrentDictionary<string, string> _fallosPendientes = new();

    public void InyectarFalloProximoFlujo(string step, string failureType)
    {
        _fallosPendientes[step] = failureType;
    }

    public bool DebeFallar(string step, out string failureType)
    {
        return _fallosPendientes.TryGetValue(step, out failureType!);
    }

    public void Consumir(string step)
    {
        _fallosPendientes.TryRemove(step, out _);
    }
}
