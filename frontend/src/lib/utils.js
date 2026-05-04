import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getRiskColor(risk) {
  const map = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    moderate: 'text-yellow-400',
    low: 'text-green-400',
    minimal: 'text-mac-400',
  }
  return map[risk?.toLowerCase()] || 'text-carbon-300'
}

export function getRiskBadgeClass(risk) {
  const map = {
    critical: 'risk-critical',
    high: 'risk-high',
    moderate: 'risk-moderate',
    low: 'risk-low',
    minimal: 'risk-minimal',
  }
  return map[risk?.toLowerCase()] || 'bg-carbon-700 text-carbon-200'
}

export function generatePatientId() {
  const prefix = 'PT'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export function formatConfidence(value) {
  return `${Math.round(value * 100)}%`
}
