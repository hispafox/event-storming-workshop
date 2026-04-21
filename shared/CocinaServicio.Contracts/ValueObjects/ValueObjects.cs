namespace CocinaServicio.Contracts.ValueObjects;

public record Plato(string Nombre, TipoPlato Tipo, bool EsLiquido);

public enum TipoPlato { Entrante, Principal, Postre, Bebida }
public enum Destino { Comedor, Cama }
public enum EstadoComida { Crudo, Cocinado, Emplatado }
public enum EstadoLimpieza { Sucia, Limpiando, Limpia, Guardada }
