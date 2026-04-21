import { motion } from 'framer-motion';

type Props = { x: number; y: number };

export function PlatoViajero({ x, y }: Props) {
  return (
    <motion.circle
      animate={{ cx: x, cy: y }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      r="14"
      fill="#f97316"
      stroke="#ea580c"
      strokeWidth="2"
    />
  );
}
