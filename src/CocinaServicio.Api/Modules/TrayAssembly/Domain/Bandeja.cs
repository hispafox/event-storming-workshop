using CocinaServicio.Contracts.ValueObjects;

namespace CocinaServicio.Api.Modules.TrayAssembly.Domain;

public class BandejaComedor
{
    public Guid Id { get; }
    public Guid ComidaId { get; }
    public bool TieneCubiertos { get; }
    public bool TieneServilleta { get; }
    public bool TieneVaso { get; }

    private BandejaComedor(Guid comidaId)
    {
        Id = Guid.NewGuid();
        ComidaId = comidaId;
        TieneCubiertos = true;
        TieneServilleta = true;
        TieneVaso = true;
    }

    public static BandejaComedor Crear(Guid comidaId) => new(comidaId);
}

public class BandejaCama
{
    public Guid Id { get; }
    public Guid ComidaId { get; }
    public bool PatasDesplegadas { get; }
    public bool AntideslizanteActivo { get; }
    public bool TapaLiquidos { get; }

    private BandejaCama(Guid comidaId, bool tieneBebida)
    {
        Id = Guid.NewGuid();
        ComidaId = comidaId;
        PatasDesplegadas = true;
        AntideslizanteActivo = true;
        TapaLiquidos = tieneBebida;
    }

    public static BandejaCama Crear(Guid comidaId, bool tieneBebida) => new(comidaId, tieneBebida);
}
