/* JSON schemas for the three answer shapes, handed to providers that can enforce a schema
 * while decoding (Ollama/llama.cpp grammar sampling, LM Studio, vLLM, OpenAI json_schema).
 *
 * Deliberately flat: no $ref, no anyOf/oneOf, no additionalProperties tricks — llama.cpp's
 * grammar converter has a history of choking on those (ollama#8444, #8063). The schema
 * guarantees *shape* so a small model cannot ramble; validate.js remains the only judge of
 * whether the contents are safe to act on. Fields that may hold any JSON value (`before`,
 * `after`) say so with a type union, which the grammar converter does support.
 */
const ANY = { type: ['number', 'string', 'boolean', 'object', 'array', 'null'] };
const STR = { type: 'string' };
const STRINGS = { type: 'array', items: { type: 'string' } };

export const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    coach_contract: { type: 'integer' },
    nochange: { type: 'boolean' },
    reading: STR,
    summary: STR,
    evidence: {
      type: 'object',
      properties: { from: STR, to: STR, sessions: { type: 'integer' } }
    },
    changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: STR,
          type: STR,
          target: {
            type: 'object',
            properties: { routineId: STR, exId: STR, weekday: { type: 'integer' } }
          },
          before: ANY,
          after: ANY,
          why: STR
        },
        required: ['type', 'why']
      }
    },
    notes: STRINGS
  },
  required: ['coach_contract']
};

const EX_SCHEMA = {
  type: 'object',
  properties: {
    id: STR, sets: { type: 'integer' }, mode: STR,
    reps: { type: 'integer' }, sec: { type: 'integer' },
    min: { type: 'integer' }, speed: { type: 'number' },
    weight: { type: 'number' }, prog: STR, inc: { type: 'number' },
    repsMin: { type: 'integer' }, repsMax: { type: 'integer' },
    bodyweight: { type: 'boolean' }, side: { type: 'boolean' },
    sg: STR, why: STR, position: { type: 'integer' }
  },
  required: ['id', 'sets']
};

// `week` and `routines[].id` are required, not optional: the week is the only thing that says
// which day trains which routine, and it points at a routine by id. A schema that leaves either
// out lets a small local model answer with routines that have no id and a week naming "r1" —
// grammar-valid, and something validate.js can only ever reject ("the week schedules 0 days but
// 3 were asked for"), through the repair round and out as a failed job.
export const CREATE_SCHEMA = {
  type: 'object',
  properties: {
    coach_contract: { type: 'integer' },
    name: STR,
    summary: STR,
    basedOn: STR,
    week: { type: 'object' },
    routines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: STR, name: STR, emoji: STR, prog: STR, why: STR,
          ex: { type: 'array', items: EX_SCHEMA }
        },
        required: ['id', 'name', 'ex']
      }
    },
    customEx: {
      type: 'array',
      items: { type: 'object', properties: { id: STR, n: STR, bp: STR, desc: STR }, required: ['id', 'n'] }
    }
  },
  required: ['coach_contract', 'week', 'routines']
};

export const DEBRIEF_SCHEMA = {
  type: 'object',
  properties: {
    coach_contract: { type: 'integer' },
    summary: STR,
    score: { type: 'integer' },
    highlights: STRINGS,
    watch: STRINGS,
    nextTime: STRINGS
  },
  required: ['coach_contract', 'summary', 'score']
};

export const SCHEMAS = { review: REVIEW_SCHEMA, create: CREATE_SCHEMA, refine: CREATE_SCHEMA, debrief: DEBRIEF_SCHEMA };
