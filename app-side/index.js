import { MessageBuilder } from '../shared/message-side'
import { hevy } from '../side-service/hevy-api'

const messageBuilder = new MessageBuilder()

function compactRoutine(routine) {
  const source = routine.routine || routine
  return {
    id: source.id,
    title: source.title,
    exercises: (source.exercises || []).map((exercise) => ({
      title: exercise.title,
      exercise_template_id: exercise.exercise_template_id,
      rest_seconds: Number(exercise.rest_seconds || 0),
      sets: (exercise.sets || []).map((set) => ({
        type: set.type || 'normal',
        weight_kg: Number(set.weight_kg || 0),
        reps: Number(set.reps || 0),
        duration_seconds: Number(set.duration_seconds || set.duration || 0)
      }))
    }))
  }
}

function compactRoutineList(response) {
  return {
    page: response.page,
    page_count: response.page_count,
    routines: (response.routines || []).map((routine) => ({
      id: routine.id,
      title: routine.title,
      updated_at: routine.updated_at
    }))
  }
}

AppSideService({
  onInit() {
    messageBuilder.listen(() => {})
    messageBuilder.on('request', async (ctx) => {
      const payload = messageBuilder.buf2Json(ctx.request.payload)

      try {
        if (payload.method === 'GET_ROUTINES') {
          const result = await hevy.routines()
          ctx.response({ data: { result: compactRoutineList(result) } })
        } else if (payload.method === 'GET_ROUTINE') {
          const result = await hevy.routine(payload.params.id)
          ctx.response({ data: { result: compactRoutine(result) } })
        } else if (payload.method === 'GET_WORKOUTS') {
          const result = await hevy.workouts(payload.params?.page || 1, payload.params?.pageSize || 10)
          ctx.response({ data: { result } })
        } else if (payload.method === 'CREATE_WORKOUT') {
          const result = await hevy.createWorkout(payload.params.workout)
          ctx.response({ data: { result } })
        } else {
          ctx.response({ data: { error: 'Método não suportado' } })
        }
      } catch (error) {
        ctx.response({ data: { error: String(error.message || error) } })
      }
    })
  },
  onRun() {},
  onDestroy() {}
})
