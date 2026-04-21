import { motion } from 'framer-motion';

type Props = {
  nombre: string;
  x: number;
  y: number;
  activo: boolean;
};

export function ServicioNode({ nombre, x, y, activo }: Props) {
  return (
    <motion.g
      animate={{ scale: activo ? 1.1 : 1 }}
      transition={{ duration: 0.3 }}
    >
      <rect
        x={x - 60}
        y={y - 30}
        width="120"
        height="60"
        rx="8"
        className={activo ? 'fill-amber-400 stroke-amber-600' : 'fill-white stroke-slate-300'}
        strokeWidth="2"
      />
      <text
        x={x}
        y={y + 5}
        textAnchor="middle"
        className={`text-sm font-semibold ${activo ? 'fill-amber-900' : 'fill-slate-700'}`}
        fontSize="12"
        fill={activo ? '#78350f' : '#334155'}
      >
        {nombre}
      </text>
      {activo && (
        <motion.circle
          cx={x + 50}
          cy={y - 25}
          r="5"
          fill="#22c55e"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.g>
  );
}
