import { HEVY_API_KEY } from './config.local'

const API_BASE = 'https://api.hevyapp.com/v1'

function parseBody(body) {
  return typeof body === 'string' ? JSON.parse(body) : body
}

async function request(path, options = {}) {
  if (!HEVY_API_KEY || HEVY_API_KEY === 'COLE_A_NOVA_CHAVE_AQUI') {
    throw new Error('Configure a chave em side-service/config.local.js')
  }

  const response = await fetch({
    url: `${API_BASE}${path}`,
    method: options.method || 'GET',
    headers: {
      'api-key': HEVY_API_KEY,
      'Content-Type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Hevy HTTP ${response.statusCode}`)
  }
  return parseBody(response.body)
}

export const hevy = {
  routines: () => request('/routines'),
  routine: (id) => request(`/routines/${id}`),
  workouts: (page = 1, pageSize = 10) => request(`/workouts?page=${page}&pageSize=${pageSize}`),
  createWorkout: (workout) => request('/workouts', {
    method: 'POST',
    body: { workout }
  })
}
