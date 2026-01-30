import type { MatchStage, TournamentFormat } from './schemas.js'

// Match generation result
export interface GeneratedMatch {
  homeTeamIndex: number | null // Index into teams array, null for TBD
  awayTeamIndex: number | null
  round: number
  matchNumber: number
  stage: MatchStage
  groupIndex?: number // For group stage matches
}

// Group assignment result
export interface GeneratedGroup {
  name: string
  teamIndices: number[] // Indices into teams array
}

// Tournament generation result
export interface GeneratedTournament {
  groups: GeneratedGroup[]
  matches: GeneratedMatch[]
}

// Round robin: every team plays every other team once
export function generateRoundRobin(teamCount: number): GeneratedTournament {
  const matches: GeneratedMatch[] = []
  let matchNumber = 1

  // Use circle method for round-robin scheduling
  // This ensures each round has all teams playing once
  const teams = Array.from({ length: teamCount }, (_, i) => i)

  // If odd number of teams, add a "bye" placeholder
  const teamsWithBye = teamCount % 2 === 1 ? [...teams, -1] : teams
  const n = teamsWithBye.length
  const rounds = n - 1
  const matchesPerRound = n / 2

  for (let round = 0; round < rounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = teamsWithBye[match]
      const away = teamsWithBye[n - 1 - match]

      // Skip matches with bye (-1)
      if (home !== undefined && away !== undefined && home !== -1 && away !== -1) {
        matches.push({
          homeTeamIndex: home,
          awayTeamIndex: away,
          round: round + 1,
          matchNumber: matchNumber++,
          stage: 'GROUP',
        })
      }
    }

    // Rotate teams (keep first team fixed)
    const first = teamsWithBye[0]
    if (first !== undefined) {
      const last = teamsWithBye.pop()
      if (last !== undefined) {
        teamsWithBye.splice(1, 0, last)
        teamsWithBye[0] = first
      }
    }
  }

  return { groups: [], matches }
}

// Single elimination bracket
export function generateSingleElimination(teamCount: number): GeneratedTournament {
  const matches: GeneratedMatch[] = []

  // Calculate bracket size (next power of 2)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)))
  const rounds = Math.ceil(Math.log2(bracketSize))

  // Seed teams with byes going to top seeds
  // Team indices 0, 1, 2... are in seed order
  const seededPositions = generateSeededBracket(bracketSize)

  let matchNumber = 1

  // Generate first round matches
  for (let i = 0; i < bracketSize / 2; i++) {
    const pos1 = seededPositions[i * 2]
    const pos2 = seededPositions[i * 2 + 1]

    const team1 = pos1 !== undefined && pos1 < teamCount ? pos1 : null
    const team2 = pos2 !== undefined && pos2 < teamCount ? pos2 : null

    // Determine stage based on rounds
    const stage = getStageForRound(1, rounds)

    matches.push({
      homeTeamIndex: team1,
      awayTeamIndex: team2,
      round: 1,
      matchNumber: matchNumber++,
      stage,
    })
  }

  // Generate subsequent rounds (TBD matches)
  let matchesInPrevRound = bracketSize / 2
  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = matchesInPrevRound / 2
    const stage = getStageForRound(round, rounds)

    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        homeTeamIndex: null, // TBD - winner of previous match
        awayTeamIndex: null,
        round,
        matchNumber: matchNumber++,
        stage,
      })
    }

    matchesInPrevRound = matchesInRound
  }

  return { groups: [], matches }
}

// Group stage + knockout
export function generateGroupKnockout(
  teamCount: number,
  groupCount: number,
  advancingPerGroup: number = 2
): GeneratedTournament {
  const groups: GeneratedGroup[] = []
  const matches: GeneratedMatch[] = []

  // Distribute teams to groups (snake draft style for balanced groups)
  const teamIndices = Array.from({ length: teamCount }, (_, i) => i)

  for (let g = 0; g < groupCount; g++) {
    groups.push({
      name: `Group ${String.fromCharCode(65 + g)}`, // A, B, C...
      teamIndices: [],
    })
  }

  // Snake draft assignment
  let direction = 1
  let groupIndex = 0
  for (const teamIndex of teamIndices) {
    const group = groups[groupIndex]
    if (group) {
      group.teamIndices.push(teamIndex)
    }

    groupIndex += direction
    if (groupIndex >= groupCount || groupIndex < 0) {
      direction *= -1
      groupIndex += direction
    }
  }

  // Generate group stage matches (round robin within each group)
  let matchNumber = 1
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g]
    if (!group) continue

    const groupTeams = group.teamIndices
    const groupMatches = generateRoundRobin(groupTeams.length)

    for (const match of groupMatches.matches) {
      const homeTeam = match.homeTeamIndex !== null ? groupTeams[match.homeTeamIndex] : null
      const awayTeam = match.awayTeamIndex !== null ? groupTeams[match.awayTeamIndex] : null

      matches.push({
        homeTeamIndex: homeTeam ?? null,
        awayTeamIndex: awayTeam ?? null,
        round: match.round,
        matchNumber: matchNumber++,
        stage: 'GROUP',
        groupIndex: g,
      })
    }
  }

  // Generate knockout stage
  const knockoutTeams = groupCount * advancingPerGroup
  const knockoutBracket = generateSingleElimination(knockoutTeams)

  // Offset match numbers and rounds for knockout stage
  const lastGroupRound = Math.max(...matches.map((m) => m.round), 0)

  for (const match of knockoutBracket.matches) {
    matches.push({
      ...match,
      round: lastGroupRound + match.round,
      matchNumber: matchNumber++,
      homeTeamIndex: null, // TBD from group stage
      awayTeamIndex: null,
    })
  }

  return { groups, matches }
}

// Generate seeded bracket positions
function generateSeededBracket(size: number): number[] {
  if (size === 1) return [0]
  if (size === 2) return [0, 1]

  const half = size / 2
  const smaller = generateSeededBracket(half)

  const result: number[] = []
  for (const seed of smaller) {
    result.push(seed)
    result.push(size - 1 - seed)
  }

  return result
}

// Get stage name based on round number
function getStageForRound(round: number, totalRounds: number): MatchStage {
  const roundsFromEnd = totalRounds - round

  switch (roundsFromEnd) {
    case 0:
      return 'FINAL'
    case 1:
      return 'SEMIFINAL'
    case 2:
      return 'QUARTERFINAL'
    case 3:
      return 'ROUND_OF_16'
    default:
      return 'GROUP' // Early elimination rounds
  }
}

// Main generator function
export function generateTournamentMatches(
  format: TournamentFormat,
  teamCount: number,
  options?: {
    groupCount?: number
    advancingPerGroup?: number
  }
): GeneratedTournament {
  switch (format) {
    case 'ROUND_ROBIN':
      return generateRoundRobin(teamCount)

    case 'SINGLE_ELIMINATION':
      return generateSingleElimination(teamCount)

    case 'DOUBLE_ELIMINATION':
      // For MVP, treat as single elimination
      // Double elimination would need losers bracket
      return generateSingleElimination(teamCount)

    case 'GROUP_KNOCKOUT': {
      const groupCount = options?.groupCount ?? Math.max(2, Math.floor(teamCount / 4))
      const advancingPerGroup = options?.advancingPerGroup ?? 2
      return generateGroupKnockout(teamCount, groupCount, advancingPerGroup)
    }

    default:
      throw new Error(`Unknown format: ${format as string}`)
  }
}
