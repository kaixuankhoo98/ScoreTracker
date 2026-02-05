import { describe, it, expect } from 'vitest'
import {
  generateRoundRobin,
  generateSingleElimination,
  generateGroupKnockout,
  generateTournamentMatches,
} from './tournament-formats.js'

describe('tournament-formats', () => {
  describe('generateRoundRobin', () => {
    it('generates correct number of matches for 4 teams', () => {
      const result = generateRoundRobin(4)
      // n * (n-1) / 2 = 4 * 3 / 2 = 6 matches
      expect(result.matches).toHaveLength(6)
      expect(result.groups).toHaveLength(0)
    })

    it('generates correct number of matches for 5 teams (odd number)', () => {
      const result = generateRoundRobin(5)
      // 5 * 4 / 2 = 10 matches
      expect(result.matches).toHaveLength(10)
    })

    it('all matches have valid team indices', () => {
      const result = generateRoundRobin(4)
      for (const match of result.matches) {
        expect(match.homeTeamIndex).toBeGreaterThanOrEqual(0)
        expect(match.homeTeamIndex).toBeLessThan(4)
        expect(match.awayTeamIndex).toBeGreaterThanOrEqual(0)
        expect(match.awayTeamIndex).toBeLessThan(4)
        expect(match.homeTeamIndex).not.toBe(match.awayTeamIndex)
      }
    })

    it('every pair of teams plays exactly once', () => {
      const result = generateRoundRobin(4)
      const pairs = new Set<string>()

      for (const match of result.matches) {
        const pair = [match.homeTeamIndex, match.awayTeamIndex].sort().join('-')
        expect(pairs.has(pair)).toBe(false) // No duplicate pairs
        pairs.add(pair)
      }

      // Should have all possible pairs
      expect(pairs.size).toBe(6)
    })
  })

  describe('generateSingleElimination', () => {
    describe('with seeding (default)', () => {
      it('generates correct bracket structure for 4 teams', () => {
        const result = generateSingleElimination(4)
        // 4 teams = 2 rounds (semifinals + final)
        // Semifinals: 2 matches, Final: 1 match
        expect(result.matches).toHaveLength(3)
        expect(result.groups).toHaveLength(0)
      })

      it('generates correct bracket structure for 8 teams', () => {
        const result = generateSingleElimination(8)
        // 8 teams = 3 rounds (quarters + semis + final)
        // 4 + 2 + 1 = 7 matches
        expect(result.matches).toHaveLength(7)
      })

      it('generates bye matches when team count is not power of 2', () => {
        const result = generateSingleElimination(5)
        // 5 teams need 8-slot bracket = 3 byes
        const byeMatches = result.matches.filter((m) => m.isBye === true)
        expect(byeMatches.length).toBe(3)
      })

      it('top seeds get byes when there are fewer teams than bracket slots', () => {
        const result = generateSingleElimination(6)
        // 6 teams in 8-slot bracket = 2 byes
        // First round matches
        const firstRound = result.matches.filter((m) => m.round === 1)

        // Find bye matches - should have team indices 0 and 1 (top seeds)
        const byeMatches = firstRound.filter((m) => m.isBye === true)
        expect(byeMatches.length).toBe(2)

        // Top 2 seeds (indices 0 and 1) should have byes
        const byeTeams = byeMatches.flatMap((m) =>
          [m.homeTeamIndex, m.awayTeamIndex].filter((i) => i !== null)
        )
        expect(byeTeams).toContain(0)
        expect(byeTeams).toContain(1)
      })

      it('assigns correct stages', () => {
        const result = generateSingleElimination(4)
        const stages = result.matches.map((m) => m.stage)
        expect(stages).toContain('SEMIFINAL')
        expect(stages).toContain('FINAL')
      })

      it('assigns correct stages for 8 teams', () => {
        const result = generateSingleElimination(8)
        const stages = result.matches.map((m) => m.stage)
        expect(stages).toContain('QUARTERFINAL')
        expect(stages).toContain('SEMIFINAL')
        expect(stages).toContain('FINAL')
      })

      it('later rounds have TBD teams (null indices)', () => {
        const result = generateSingleElimination(4)
        const finalMatch = result.matches.find((m) => m.stage === 'FINAL')
        expect(finalMatch).toBeDefined()
        expect(finalMatch?.homeTeamIndex).toBeNull()
        expect(finalMatch?.awayTeamIndex).toBeNull()
      })
    })

    describe('without seeding', () => {
      it('still generates correct number of matches', () => {
        const result = generateSingleElimination(8, false)
        expect(result.matches).toHaveLength(7)
      })

      it('still generates correct number of matches for non-power-of-2 teams', () => {
        const result = generateSingleElimination(6, false)
        // 6 teams in 8-slot bracket = 7 matches
        expect(result.matches).toHaveLength(7)
      })

      it('all first-round non-bye matches have valid team indices', () => {
        const result = generateSingleElimination(8, false)
        const firstRound = result.matches.filter((m) => m.round === 1)

        for (const match of firstRound) {
          if (!match.isBye) {
            expect(match.homeTeamIndex).not.toBeNull()
            expect(match.awayTeamIndex).not.toBeNull()
            expect(match.homeTeamIndex).toBeGreaterThanOrEqual(0)
            expect(match.homeTeamIndex).toBeLessThan(8)
            expect(match.awayTeamIndex).toBeGreaterThanOrEqual(0)
            expect(match.awayTeamIndex).toBeLessThan(8)
          }
        }
      })

      it('team distribution is randomized (statistical test)', () => {
        // Run multiple times and check that results vary
        const results: string[] = []
        for (let i = 0; i < 10; i++) {
          const result = generateSingleElimination(8, false)
          const firstRound = result.matches.filter((m) => m.round === 1)
          const key = firstRound.map((m) => `${m.homeTeamIndex}-${m.awayTeamIndex}`).join(',')
          results.push(key)
        }

        // At least some variation expected (not all identical)
        const uniqueResults = new Set(results)
        expect(uniqueResults.size).toBeGreaterThan(1)
      })
    })
  })

  describe('generateGroupKnockout', () => {
    describe('with seeding', () => {
      it('generates correct number of groups', () => {
        const result = generateGroupKnockout(8, 2, 2, true)
        expect(result.groups).toHaveLength(2)
      })

      it('distributes teams evenly across groups', () => {
        const result = generateGroupKnockout(8, 2, 2, true)
        expect(result.groups[0]?.teamIndices).toHaveLength(4)
        expect(result.groups[1]?.teamIndices).toHaveLength(4)
      })

      it('places top seeds in different groups (pot-based)', () => {
        const result = generateGroupKnockout(8, 2, 2, true)
        // With 8 teams and 2 groups:
        // Group A should get seeds 1,3,5,7 (indices 0,2,4,6)
        // Group B should get seeds 2,4,6,8 (indices 1,3,5,7)
        const groupA = result.groups[0]?.teamIndices ?? []

        // Seed 1 (index 0) and seed 2 (index 1) should be in different groups
        const seed1Group = groupA.includes(0) ? 'A' : 'B'
        const seed2Group = groupA.includes(1) ? 'A' : 'B'
        expect(seed1Group).not.toBe(seed2Group)
      })

      it('generates group stage matches', () => {
        const result = generateGroupKnockout(8, 2, 2, true)
        const groupMatches = result.matches.filter((m) => m.stage === 'GROUP')
        // Each group has 4 teams = 6 matches per group = 12 total
        expect(groupMatches.length).toBe(12)
      })

      it('generates knockout stage matches', () => {
        const result = generateGroupKnockout(8, 2, 2, true)
        // 2 groups * 2 advancing = 4 teams in knockout
        // Knockout: 2 semis + 1 final = 3 matches
        const knockoutMatches = result.matches.filter((m) => m.stage !== 'GROUP')
        expect(knockoutMatches.length).toBe(3)
      })
    })

    describe('without seeding', () => {
      it('still generates correct number of groups', () => {
        const result = generateGroupKnockout(8, 2, 2, false)
        expect(result.groups).toHaveLength(2)
      })

      it('distributes teams evenly across groups', () => {
        const result = generateGroupKnockout(8, 2, 2, false)
        expect(result.groups[0]?.teamIndices).toHaveLength(4)
        expect(result.groups[1]?.teamIndices).toHaveLength(4)
      })

      it('randomizes team distribution (statistical test)', () => {
        const results: string[] = []
        for (let i = 0; i < 10; i++) {
          const result = generateGroupKnockout(8, 2, 2, false)
          const key = result.groups.map((g) => g.teamIndices.sort().join(',')).join('|')
          results.push(key)
        }

        // At least some variation expected
        const uniqueResults = new Set(results)
        expect(uniqueResults.size).toBeGreaterThan(1)
      })
    })
  })

  describe('generateTournamentMatches', () => {
    it('generates round robin for ROUND_ROBIN format', () => {
      const result = generateTournamentMatches('ROUND_ROBIN', 4)
      expect(result.matches).toHaveLength(6)
      expect(result.groups).toHaveLength(0)
    })

    it('generates single elimination for SINGLE_ELIMINATION format', () => {
      const result = generateTournamentMatches('SINGLE_ELIMINATION', 8)
      expect(result.matches).toHaveLength(7)
      expect(result.groups).toHaveLength(0)
    })

    it('passes useSeeding option to SINGLE_ELIMINATION', () => {
      // With seeding, top seeds get consistent placement
      const seeded1 = generateTournamentMatches('SINGLE_ELIMINATION', 8, { useSeeding: true })
      const seeded2 = generateTournamentMatches('SINGLE_ELIMINATION', 8, { useSeeding: true })

      // Seeded brackets should have same structure
      const firstRound1 = seeded1.matches.filter((m) => m.round === 1)
      const firstRound2 = seeded2.matches.filter((m) => m.round === 1)

      expect(firstRound1.map((m) => m.homeTeamIndex)).toEqual(
        firstRound2.map((m) => m.homeTeamIndex)
      )
    })

    it('generates group knockout for GROUP_KNOCKOUT format', () => {
      const result = generateTournamentMatches('GROUP_KNOCKOUT', 16, {
        groupCount: 4,
        advancingPerGroup: 2,
      })
      expect(result.groups).toHaveLength(4)
    })

    it('passes useSeeding option to GROUP_KNOCKOUT', () => {
      const seeded = generateTournamentMatches('GROUP_KNOCKOUT', 8, {
        groupCount: 2,
        useSeeding: true,
      })

      // Verify top 2 seeds are in different groups
      const groupA = seeded.groups[0]?.teamIndices ?? []
      const groupB = seeded.groups[1]?.teamIndices ?? []

      const seed1InA = groupA.includes(0)
      const seed1InB = groupB.includes(0)
      const seed2InA = groupA.includes(1)
      const seed2InB = groupB.includes(1)

      // Seed 1 and 2 should be in different groups
      expect((seed1InA && seed2InB) || (seed1InB && seed2InA)).toBe(true)
    })

    it('treats DOUBLE_ELIMINATION as single elimination', () => {
      const result = generateTournamentMatches('DOUBLE_ELIMINATION', 8)
      // Same as single elimination for now
      expect(result.matches).toHaveLength(7)
    })
  })

  describe('bye match handling', () => {
    it('marks bye matches correctly', () => {
      const result = generateSingleElimination(6)
      const byeMatches = result.matches.filter((m) => m.isBye === true)

      for (const match of byeMatches) {
        // Bye matches have one team and one null
        const hasOneTeam =
          (match.homeTeamIndex !== null && match.awayTeamIndex === null) ||
          (match.homeTeamIndex === null && match.awayTeamIndex !== null)
        expect(hasOneTeam).toBe(true)
      }
    })

    it('non-bye first round matches have both teams', () => {
      const result = generateSingleElimination(8)
      const firstRound = result.matches.filter((m) => m.round === 1)

      for (const match of firstRound) {
        if (!match.isBye) {
          expect(match.homeTeamIndex).not.toBeNull()
          expect(match.awayTeamIndex).not.toBeNull()
        }
      }
    })
  })
})
