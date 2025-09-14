"use client";

import React, { useRef, type ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';

interface StaggerAnimationProps {
  children: ReactNode;
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
  duration?: number;
  className?: string;
}

const StaggerAnimation: React.FC<StaggerAnimationProps> = ({
  children,
  staggerDelay = 0.1,
  direction = 'up',
  duration = 0.6,
  className = ''
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const getInitialAnimation = () => {
    switch (direction) {
      case 'up': return { opacity: 0, y: 50 };
      case 'down': return { opacity: 0, y: -50 };
      case 'left': return { opacity: 0, x: 50 };
      case 'right': return { opacity: 0, x: -50 };
      case 'scale': return { opacity: 0, scale: 0.9 };
      default: return { opacity: 0, y: 50 };
    }
  };

  const getAnimateAnimation = () => ({ opacity: 1, x: 0, y: 0, scale: 1 });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: getInitialAnimation(),
            visible: getAnimateAnimation(),
          }}
          transition={{
            duration,
            type: "spring",
            stiffness: 100,
            damping: 20,
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default StaggerAnimation;
