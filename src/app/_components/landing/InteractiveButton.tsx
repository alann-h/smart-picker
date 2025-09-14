"use client";

import { motion, type Transition } from "framer-motion";
import { type ReactNode } from "react";

interface InteractiveButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  animationType?: "scale" | "bounce" | "glow" | "slide";
  intensity?: "subtle" | "medium" | "strong";
  variant?: "primary" | "secondary";
  href?: string;
}

const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  children,
  onClick,
  className = "",
  animationType = "scale",
  intensity = "medium",
  variant = "primary",
  href,
}) => {
  const getAnimationProps = () => {
    const baseTransition: Transition = { type: "spring", stiffness: 400, damping: 17 };
    const intensityMultiplier: Record<string, number> = { subtle: 0.5, medium: 1, strong: 1.5 };
    const multiplier = intensityMultiplier[intensity] ?? 1;

    switch (animationType) {
      case "bounce":
        return {
          whileHover: { scale: 1 + 0.05 * multiplier, y: -2 * multiplier },
          whileTap: { scale: 1 - 0.05 * multiplier, y: 0 },
          transition: baseTransition,
        };
      case "glow":
        return {
          whileHover: {
            scale: 1 + 0.03 * multiplier,
            boxShadow: `0 0 ${20 * multiplier}px rgba(59, 130, 246, ${0.4 * multiplier})`,
          },
          whileTap: { scale: 1 - 0.02 * multiplier },
          transition: baseTransition,
        };
      case "slide":
        return {
          whileHover: { x: 5 * multiplier, scale: 1 + 0.02 * multiplier },
          whileTap: { x: 0, scale: 1 - 0.02 * multiplier },
          transition: baseTransition,
        };
      case "scale":
      default:
        return {
          whileHover: { scale: 1 + 0.05 * multiplier },
          whileTap: { scale: 1 - 0.05 * multiplier },
          transition: baseTransition,
        };
    }
  };

  const baseClasses =
    "flex items-center justify-center px-6 py-3 rounded-lg text-base font-semibold duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400",
  };

  const ButtonComponent = href ? motion.a : motion.button;

  return (
    <ButtonComponent
      href={href}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...getAnimationProps()}
    >
      {children}
    </ButtonComponent>
  );
};

export default InteractiveButton;
