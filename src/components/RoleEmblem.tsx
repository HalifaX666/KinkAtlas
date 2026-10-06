import { ROLE_EMBLEM_VIEWBOX, roleEmblemRecipe, type RoleEmblemCommand, type RoleEmblemRecipe } from '../data/roleEmblems'

function renderCommand(command: RoleEmblemCommand, index: number) {
  if (command.kind === 'line') return <line key={index} x1={command.from[0]} y1={command.from[1]} x2={command.to[0]} y2={command.to[1]} />
  if (command.kind === 'polyline') {
    const points = command.points.map((point) => point.join(',')).join(' ')
    return command.closed ? <polygon key={index} points={points} /> : <polyline key={index} points={points} />
  }
  if (command.kind === 'circle') return <circle key={index} cx={command.center[0]} cy={command.center[1]} r={command.radius} />
  return <path key={index} d={`M ${command.start.join(' ')} C ${command.control1.join(' ')}, ${command.control2.join(' ')}, ${command.end.join(' ')}`} />
}

export function RoleEmblem({ roleId, recipe: providedRecipe, className = '' }: { roleId?: string; recipe?: RoleEmblemRecipe; className?: string }) {
  const recipe = providedRecipe ?? (roleId ? roleEmblemRecipe(roleId) : undefined)
  if (!recipe) throw new Error('RoleEmblem requires a role ID or emblem recipe.')

  return <svg
    className={`role-emblem${className ? ` ${className}` : ''}`}
    viewBox={`0 0 ${ROLE_EMBLEM_VIEWBOX.width} ${ROLE_EMBLEM_VIEWBOX.height}`}
    aria-hidden="true"
    focusable="false"
    data-emblem-key={recipe.identityKey}
    data-emblem-family={recipe.familyKey}
    data-emblem-motif={recipe.motif}
  >
    <g fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round">
      {recipe.commands.map(renderCommand)}
    </g>
  </svg>
}
