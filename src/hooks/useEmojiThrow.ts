'use client'

import { useCallback, useRef } from 'react'

interface Point {
    x: number
    y: number
}

interface DOMRectLike {
    left: number
    top: number
    width: number
    height: number
}

/**
 * Generates a random number within a specified range.
 */
const getRandomNumber = (
    min = 0.1,
    max = 0.4,
    isPositive = Math.random() < 0.5
): number => {
    const random = Math.random() * (max - min) + min
    return isPositive ? random : -random
}

/**
 * Calculates the center position of a DOM element.
 */
const getCenterPosition = (rect: DOMRectLike): Point => ({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
})

/**
 * Calculates the target position with a random offset from the center.
 */
const getTargetPosition = (rect: DOMRectLike): Point => {
    const center = getCenterPosition(rect)
    return {
        x: center.x - getRandomNumber(0, 15, true),
        y: center.y - getRandomNumber(0, 25, true)
    }
}

/**
 * Calculates the midpoint between two points.
 */
const getMidpoint = (start: Point, target: Point): Point => ({
    x: (start.x + target.x) / 2,
    y: (start.y + target.y) / 2
})

/**
 * Calculates the distance between two points.
 */
const getDistance = (start: Point, target: Point): number => {
    return Math.sqrt(
        Math.pow(target.x - start.x, 2) + Math.pow(target.y - start.y, 2)
    )
}

/**
 * Calculates the control point for the quadratic Bezier curve.
 * This creates the arc effect for the flying emoji.
 */
const getControlPoint = (start: Point, target: Point): Point => {
    const midpoint = getMidpoint(start, target)
    const distance = getDistance(start, target)

    const angle = Math.atan2(target.y - start.y, target.x - start.x)
    const perpAngle = angle + Math.PI / 2
    const controlPointDistance = distance * getRandomNumber(0.2, 0.4, true)

    return {
        x: midpoint.x + Math.cos(perpAngle) * controlPointDistance,
        y: midpoint.y + Math.sin(perpAngle) * controlPointDistance
    }
}

/**
 * Creates and styles the emoji element.
 */
const createEmojiElement = (
    emoji: string,
    startPoint: Point
): HTMLDivElement => {
    const emojiElement = document.createElement('div')
    Object.assign(emojiElement.style, {
        position: 'fixed',
        fontSize: '32px',
        pointerEvents: 'none',
        zIndex: '9999',
        left: '0',
        top: '0',
        transform: `translate(${startPoint.x}px, ${startPoint.y}px) translate(-50%, -50%)`,
        transition: 'none',
        willChange: 'transform'
    })
    emojiElement.textContent = emoji
    emojiElement.className = 'flying-emoji'
    document.body.appendChild(emojiElement)
    return emojiElement
}

/**
 * Calculates a point on a quadratic Bezier curve with easing.
 */
const calculateBezierPoint = (
    start: Point,
    control: Point,
    target: Point,
    progress: number
): Point => {
    // Ease-out quad function for natural deceleration
    const easeProgress = 1 - Math.pow(1 - progress, 2)
    return {
        x:
            Math.pow(1 - easeProgress, 2) * start.x +
            2 * (1 - easeProgress) * easeProgress * control.x +
            Math.pow(easeProgress, 2) * target.x,
        y:
            Math.pow(1 - easeProgress, 2) * start.y +
            2 * (1 - easeProgress) * easeProgress * control.y +
            Math.pow(easeProgress, 2) * target.y
    }
}

/**
 * Custom hook for throwing emoji animations.
 * Uses requestAnimationFrame and quadratic Bezier curves for smooth, arc-like motion.
 */
export const useEmojiThrow = () => {
    const animationRef = useRef<number>()
    const emojiRef = useRef<HTMLDivElement | null>(null)

    const throwEmoji = useCallback(
        (emoji: string, sourceId: string, targetId: string) => {
            const sourceEl = document.getElementById(sourceId)
            const targetEl = document.getElementById(targetId)

            if (!sourceEl || !targetEl) {
                console.warn('Source or target element not found:', { sourceId, targetId })
                return
            }

            const startRect = sourceEl.getBoundingClientRect()
            const targetRect = targetEl.getBoundingClientRect()

            const startPoint = getCenterPosition(startRect)
            const targetPoint = getTargetPosition(targetRect)
            const controlPoint = getControlPoint(startPoint, targetPoint)

            const emojiElement = createEmojiElement(emoji, startPoint)
            emojiRef.current = emojiElement

            let startTime = performance.now()
            const duration = 800 // Animation duration in milliseconds

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime
                const progress = Math.min(elapsed / duration, 1)

                const position = calculateBezierPoint(
                    startPoint,
                    controlPoint,
                    targetPoint,
                    progress
                )

                // Add slight rotation and scale for more dynamic feel
                const rotation = progress * 360 * (Math.random() > 0.5 ? 1 : -1) * 0.5
                const scale = 1 + Math.sin(progress * Math.PI) * 0.3

                emojiElement.style.transform =
                    `translate(${position.x}px, ${position.y}px) translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate)
                } else {
                    // Final position with fade out
                    emojiElement.style.transform =
                        `translate(${targetPoint.x}px, ${targetPoint.y}px) translate(-50%, -50%) scale(1.2)`
                    emojiElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'
                    emojiElement.style.opacity = '0'

                    setTimeout(() => {
                        emojiElement.remove()
                    }, 300)
                }
            }

            requestAnimationFrame(() => {
                startTime = performance.now()
                animate(startTime)
            })
        },
        []
    )

    /**
     * Throw emoji from a point to a target element
     */
    const throwEmojiFromPoint = useCallback(
        (emoji: string, startX: number, startY: number, targetId: string) => {
            const targetEl = document.getElementById(targetId)

            if (!targetEl) {
                console.warn('Target element not found:', targetId)
                return
            }

            const targetRect = targetEl.getBoundingClientRect()
            const startPoint: Point = { x: startX, y: startY }
            const targetPoint = getTargetPosition(targetRect)
            const controlPoint = getControlPoint(startPoint, targetPoint)

            const emojiElement = createEmojiElement(emoji, startPoint)
            emojiRef.current = emojiElement

            let startTime = performance.now()
            const duration = 800

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime
                const progress = Math.min(elapsed / duration, 1)

                const position = calculateBezierPoint(
                    startPoint,
                    controlPoint,
                    targetPoint,
                    progress
                )

                const rotation = progress * 360 * (Math.random() > 0.5 ? 1 : -1) * 0.5
                const scale = 1 + Math.sin(progress * Math.PI) * 0.3

                emojiElement.style.transform =
                    `translate(${position.x}px, ${position.y}px) translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate)
                } else {
                    emojiElement.style.transform =
                        `translate(${targetPoint.x}px, ${targetPoint.y}px) translate(-50%, -50%) scale(1.2)`
                    emojiElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'
                    emojiElement.style.opacity = '0'

                    setTimeout(() => {
                        emojiElement.remove()
                    }, 300)
                }
            }

            requestAnimationFrame(() => {
                startTime = performance.now()
                animate(startTime)
            })
        },
        []
    )

    const cleanup = useCallback(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }
        if (emojiRef.current) {
            emojiRef.current.remove()
        }
    }, [])

    return { throwEmoji, throwEmojiFromPoint, cleanup }
}

export default useEmojiThrow
