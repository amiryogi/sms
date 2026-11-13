import React from "react";
import { motion } from "framer-motion";

/*
 * Scroll-in animation for the public site. Content fades and rises once as it enters
 * the viewport. PublicLayout's <MotionConfig reducedMotion="user"> turns the movement
 * off for visitors who ask their system for less motion.
 */

const EASE = [0.16, 1, 0.3, 1];

/** One block that fades up when scrolled into view. */
export const Reveal = ({ as = "div", delay = 0, y = 24, className, children, ...props }) => {
  const Component = motion[as] || motion.div;
  return (
    <Component
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } };

/** A list whose children (StaggerItem) appear one after another. */
export const Stagger = ({ as = "div", className, children, ...props }) => {
  const Component = motion[as] || motion.div;
  return (
    <Component variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className={className} {...props}>
      {children}
    </Component>
  );
};

export const StaggerItem = ({ as = "div", className, children, ...props }) => {
  const Component = motion[as] || motion.div;
  return (
    <Component variants={item} className={className} {...props}>
      {children}
    </Component>
  );
};
