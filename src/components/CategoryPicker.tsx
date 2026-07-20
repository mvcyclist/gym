import {
  BUILDER_CATEGORIES,
  type BuilderCategoryId,
} from '../data/workoutCategories'
import { getCategoryTag, type CategoryTagType } from '../services/categoryRecommendationService'

interface CategoryPickerProps {
  selectedId?: BuilderCategoryId | null
  onSelect: (id: BuilderCategoryId) => void
}

const TILE_STYLES: Record<CategoryTagType, {
  border: string
  background: string
  tagColor: string
  hoverBorder: string
  hoverBackground: string
}> = {
  recommended: {
    border: '1px solid rgba(227,64,46,0.5)',
    background: 'rgba(227,64,46,0.12)',
    tagColor: '#e3402e',
    hoverBorder: '1px solid #e3402e',
    hoverBackground: 'rgba(227,64,46,0.18)',
  },
  recently_covered: {
    border: '1px solid rgba(240,168,60,0.4)',
    background: '#141414',
    tagColor: '#f0a83c',
    hoverBorder: '1px solid rgba(163,163,163,0.5)',
    hoverBackground: '#1c1c1c',
  },
  fine_today: {
    border: '1px solid rgba(255,255,255,0.14)',
    background: '#141414',
    tagColor: '#6b6b6f',
    hoverBorder: '1px solid rgba(163,163,163,0.5)',
    hoverBackground: '#1c1c1c',
  },
  info: {
    border: '1px solid rgba(74,222,128,0.35)',
    background: '#141414',
    tagColor: '#4ade80',
    hoverBorder: '1px solid #4ade80',
    hoverBackground: 'rgba(74,222,128,0.12)',
  },
}

export function CategoryPicker({ selectedId = null, onSelect }: CategoryPickerProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 12,
    }}>
      {BUILDER_CATEGORIES.map((category) => {
        const tag = getCategoryTag(category.id)
        const style = TILE_STYLES[tag.type]
        const selected = selectedId === category.id
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            style={{
              textAlign: 'left',
              borderRadius: 14,
              padding: '22px 18px',
              cursor: 'pointer',
              border: selected ? '1px solid #e3402e' : style.border,
              background: selected ? 'rgba(227,64,46,0.18)' : style.background,
              color: '#f5f5f4',
              transition: 'border-color 0.12s, background 0.12s',
              boxShadow: selected ? '0 0 0 1px rgba(227,64,46,0.35)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (selected) return
              e.currentTarget.style.border = style.hoverBorder
              e.currentTarget.style.background = style.hoverBackground
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = selected ? '1px solid #e3402e' : style.border
              e.currentTarget.style.background = selected
                ? 'rgba(227,64,46,0.18)'
                : style.background
            }}
          >
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 8,
              color: style.tagColor,
            }}>
              {tag.label}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
              {category.label}
            </div>
            <div style={{ fontSize: 12, color: '#a3a3a3' }}>
              {tag.subtitle}
            </div>
          </button>
        )
      })}
    </div>
  )
}
