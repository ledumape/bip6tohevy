import { createWidget, widget, prop, align } from '@zos/ui'
import { HeartRate, Vibrator, VIBRATOR_SCENE_TIMER, VIBRATOR_SCENE_STRONG_REMINDER, VIBRATOR_SCENE_NOTIFICATION } from '@zos/sensor'
import { onKey, offKey, KEY_HOME, KEY_SHORTCUT, KEY_UP, KEY_DOWN, KEY_EVENT_CLICK } from '@zos/interaction'
import { setPageBrightTime, resetPageBrightTime } from '@zos/display'

const { messageBuilder } = getApp()._options.globalData

Page({
  state: {
    mode: 'home',
    routines: [],
    selectedRoutineIndex: 0,
    routine: null,
    pendingExercises: [],
    exerciseSetProgress: {},
    exerciseIndex: 0,
    setIndex: 0,
    weight: 0,
    reps: 0,
    completed: [],
    workoutStartedAt: null,
    heartRate: null,
    hrSamples: [],
    averageBpm: 0,
    maxBpm: 0,
    background: null,
    panel: null,
    title: null,
    routineText: null,
    status: null,
    progress: null,
    next: null,
    pickerButton: null,
    action: null,
    weightDown: null,
    weightUp: null,
    repsDown: null,
    repsUp: null,
    restTimerId: null,
    remainingRest: 0,
    elapsedTime: 0,
    elapsedTimerId: null,
    timerRunning: false,
    vibrator: null,
    vibrationTimerId: null,
    isSubmitting: false,
    keyListener: null,
    hrListener: null
  },

  build() {
    this.state.background = createWidget(widget.FILL_RECT, {
      x: 0, y: 0, w: 390, h: 450, color: 0x08111f
    })
    this.state.panel = createWidget(widget.FILL_RECT, {
      x: 10, y: 54, w: 370, h: 300, color: 0x12243a
    })
    this.state.title = createWidget(widget.TEXT, {
      x: 18, y: 14, w: 354, h: 40, color: 0xff4d5a,
      text_size: 28, align_h: align.CENTER_H, text: 'REV TEST'
    })
    this.state.routineText = createWidget(widget.TEXT, {
      x: 18, y: 62, w: 354, h: 58, color: 0xffffff,
      text_size: 22, align_h: align.CENTER_H, text: 'Escolha uma rotina'
    })
    this.state.status = createWidget(widget.TEXT, {
      x: 18, y: 128, w: 354, h: 88, color: 0xffffff,
      text_size: 25, align_h: align.CENTER_H, text: 'Toque em BUSCAR ROTINAS'
    })
    this.state.progress = createWidget(widget.TEXT, {
      x: 18, y: 220, w: 354, h: 32, color: 0xb8bec9,
      text_size: 17, align_h: align.CENTER_H, text: ''
    })
    this.state.next = createWidget(widget.TEXT, {
      x: 18, y: 255, w: 354, h: 28, color: 0x8d96a5,
      text_size: 16, align_h: align.CENTER_H, text: ''
    })
    this.state.pickerButton = this.button(28, 290, 334, 54, 'PROXIMA ROTINA', () => this.cycleRoutine(1))
    this.state.action = this.button(28, 372, 334, 58, 'BUSCAR ROTINAS', () => this.primaryAction())
    this.state.weightDown = this.controlButton(28, 290, 'KG -', () => this.changeWeight(-0.5))
    this.state.weightUp = this.controlButton(111, 290, 'KG +', () => this.changeWeight(0.5))
    this.state.repsDown = this.controlButton(194, 290, 'REP -', () => this.changeReps(-1))
    this.state.repsUp = this.controlButton(277, 290, 'REP +', () => this.changeReps(1))
    this.state.heartRate = new HeartRate()
    this.state.vibrator = new Vibrator()
    this.state.hrListener = () => {
      const value = Number(this.state.heartRate.getCurrent() || 0)
      if (value > 0) {
        this.state.hrSamples.push(value)
        this.state.averageBpm = Math.round(this.state.hrSamples.reduce((sum, item) => sum + item, 0) / this.state.hrSamples.length)
        this.state.maxBpm = Math.max(this.state.maxBpm, value)
        if (this.state.mode === 'workout') this.updateWorkoutText()
      }
    }
    this.state.heartRate.onCurrentChange(this.state.hrListener)
    this.state.keyListener = (key, keyEvent) => {
      if (keyEvent !== KEY_EVENT_CLICK) return false
      if (this.state.mode === 'chooser') {
        if (key === KEY_HOME || key === KEY_UP) this.cycleRoutine(-1)
        if (key === KEY_SHORTCUT || key === KEY_DOWN) this.cycleRoutine(1)
        return true
      }
      if (this.state.mode === 'workout') {
        if (key === KEY_HOME || key === KEY_UP) this.skipExercise()
        if (key === KEY_SHORTCUT || key === KEY_DOWN) this.primaryAction()
        return true
      }
      if (this.state.mode === 'rest') {
        if (key === KEY_HOME || key === KEY_UP) this.skipExercise()
        if (key === KEY_SHORTCUT || key === KEY_DOWN) this.skipRest()
        return true
      }
      if (key === KEY_HOME || key === KEY_SHORTCUT || key === KEY_UP || key === KEY_DOWN) {
        this.primaryAction()
        return true
      }
      return false
    }
    onKey({ callback: this.state.keyListener })
    this.setMode('home')
    setTimeout(() => this.loadRoutines(), 700)
  },

  button(x, y, w, h, text, click_func) {
    return createWidget(widget.BUTTON, {
      x, y, w, h, radius: 10, normal_color: 0x29405c,
      press_color: 0x1d2d43, text, text_size: 19, click_func
    })
  },

  controlButton(x, y, text, click_func) {
    return this.button(x, y, 78, 54, text, click_func)
  },

  visible(item, value) {
    item.setProperty(prop.VISIBLE, value)
  },

  setMode(mode) {
    this.state.mode = mode
    const chooser = mode === 'chooser'
    const workout = mode === 'workout'
    const rest = mode === 'rest'
    this.visible(this.state.pickerButton, chooser)
    this.visible(this.state.weightDown, workout)
    this.visible(this.state.weightUp, workout)
    this.visible(this.state.repsDown, workout)
    this.visible(this.state.repsUp, workout)
    this.visible(this.state.action, mode !== 'sending')
    this.state.action.setProperty(prop.MORE, {
      x: 28, y: 372, w: 334, h: 58,
      text: mode === 'home' ? 'BUSCAR ROTINAS' : mode === 'chooser' ? 'ABRIR ROTINA' : mode === 'workout' ? (this.isTimedExercise() ? (this.state.timerRunning ? 'FINALIZAR TEMPO' : 'INICIAR TEMPO') : 'CONCLUIR SERIE') : mode === 'rest' ? 'PULAR DESCANSO' : mode === 'done' ? 'NOVO TREINO' : mode === 'sending' ? 'ENVIANDO...' : 'TENTAR NOVAMENTE',
      normal_color: workout ? 0x16a34a : rest ? 0xf59e0b : 0xf04444,
      press_color: workout ? 0x15803d : rest ? 0xd97706 : 0xc73535
    })
  },

  setText(widgetInstance, text) {
    widgetInstance.setProperty(prop.TEXT, text)
  },

  primaryAction() {
    if (this.state.mode === 'sending' || this.state.isSubmitting) return
    if (this.state.mode === 'home') return this.loadRoutines()
    if (this.state.mode === 'chooser') return this.openSelectedRoutine()
    if (this.state.mode === 'workout') return this.finishSet()
    if (this.state.mode === 'rest') return this.skipRest()
    this.state.routines = []
    this.state.routine = null
    this.setMode('home')
    this.setText(this.state.status, 'Toque em BUSCAR ROTINAS')
  },

  loadRoutines() {
    this.setText(this.state.status, 'Buscando suas 4 rotinas...')
    Promise.resolve().then(() => messageBuilder.request({ method: 'GET_ROUTINES' })).then(({ result }) => {
      if (result?.error) throw new Error(result.error)
      this.state.routines = (result?.routines || []).slice(0, 4)
      if (!this.state.routines.length) throw new Error('Nenhuma rotina encontrada')
      this.state.selectedRoutineIndex = 0
      this.setMode('chooser')
      this.showChooser()
    }).catch((error) => this.setText(this.state.status, `Erro ao buscar\n${error.message || error}`))
  },

  cycleRoutine(delta) {
    if (!this.state.routines.length) return
    const count = this.state.routines.length
    this.state.selectedRoutineIndex = (this.state.selectedRoutineIndex + delta + count) % count
    this.showChooser()
  },

  showChooser() {
    const routine = this.state.routines[this.state.selectedRoutineIndex]
    this.setText(this.state.routineText, `Rotina ${this.state.selectedRoutineIndex + 1}/${this.state.routines.length}\n${routine.title}`)
    this.setText(this.state.status, 'Use PROXIMA ROTINA ou os botoes fisicos\npara escolher')
    this.setText(this.state.progress, '')
    this.setText(this.state.next, '')
  },

  openSelectedRoutine() {
    const selected = this.state.routines[this.state.selectedRoutineIndex]
    this.setText(this.state.status, 'Carregando exercicios...')
    Promise.resolve().then(() => messageBuilder.request({ method: 'GET_ROUTINE', params: { id: selected.id } })).then(({ result }) => {
      if (result?.error) throw new Error(result.error)
      if (!result?.exercises?.length) throw new Error('A rotina nao possui exercicios')
      this.state.routine = result
      this.state.workoutStartedAt = new Date().toISOString()
      this.state.pendingExercises = result.exercises.map((_, index) => index)
      this.state.exerciseSetProgress = {}
      this.state.exerciseIndex = 0
      this.state.setIndex = 0
      this.state.completed = []
      this.state.hrSamples = []
      this.state.averageBpm = 0
      this.state.maxBpm = 0
      setPageBrightTime({ brightTime: 2147483000 })
      this.setMode('workout')
      this.showCurrentSet()
    }).catch((error) => this.setText(this.state.status, `Erro ao abrir\n${error.message || error}`))
  },

  showCurrentSet(resetValues = true) {
    const exercise = this.state.routine.exercises[this.state.exerciseIndex]
    this.state.setIndex = Number(this.state.exerciseSetProgress[this.state.exerciseIndex] || 0)
    const set = exercise.sets[this.state.setIndex]
    this.stopElapsedTimer()
    this.state.elapsedTime = 0
    this.state.timerRunning = false
    if (resetValues) {
      this.state.weight = Number(set.weight_kg || 0)
      this.state.reps = Number(set.reps || 0)
    }
    this.updateWorkoutText()
  },

  updateWorkoutText() {
    if (!this.state.routine) return
    const exercise = this.state.routine.exercises[this.state.exerciseIndex]
    const queuePosition = this.state.pendingExercises.indexOf(this.state.exerciseIndex)
    const nextIndex = queuePosition >= 0 && this.state.pendingExercises.length > 1
      ? this.state.pendingExercises[(queuePosition + 1) % this.state.pendingExercises.length]
      : null
    const nextExercise = nextIndex === null ? null : this.state.routine.exercises[nextIndex]
    const timed = this.isTimedExercise()
    this.setText(this.state.routineText, this.state.routine.title)
    this.setText(this.state.status, timed ? `${exercise.title}\n${this.formatDuration(this.state.elapsedTime)}` : `${exercise.title}\n${this.state.weight} kg x ${this.state.reps}`)
    this.setText(this.state.progress, `Exercicio ${this.state.exerciseIndex + 1}/${this.state.routine.exercises.length}  |  Serie ${this.state.setIndex + 1}/${exercise.sets.length}  |  BPM ${this.state.averageBpm || '--'}`)
    this.setText(this.state.next, timed ? (this.state.timerRunning ? 'Toque para terminar' : 'Exercicio por tempo') : nextExercise ? `Proximo: ${nextExercise.title}` : 'Ultimo da fila')
  },

  changeWeight(delta) {
    if (this.state.mode !== 'workout') return
    this.state.weight = Math.max(0, this.state.weight + delta)
    this.updateWorkoutText()
  },

  changeReps(delta) {
    if (this.state.mode !== 'workout') return
    this.state.reps = Math.max(0, this.state.reps + delta)
    this.updateWorkoutText()
  },

  isTimedExercise() {
    const exercise = this.state.routine && this.state.routine.exercises[this.state.exerciseIndex]
    if (!exercise) return false
    const title = String(exercise.title || '').toLowerCase()
    return title.indexOf('prancha') >= 0 || title.indexOf('plank') >= 0 || title.indexOf('isometr') >= 0 || title.indexOf('wall sit') >= 0
  },

  formatDuration(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds || 0))
    return `${Math.floor(seconds / 60) < 10 ? '0' : ''}${Math.floor(seconds / 60)}:${seconds % 60 < 10 ? '0' : ''}${seconds % 60}`
  },

  toggleTimedExercise() {
    if (this.state.mode !== 'workout' || !this.isTimedExercise()) return
    if (this.state.timerRunning) return this.finishTimedSet()
    this.state.timerRunning = true
    this.setMode('workout')
    this.updateWorkoutText()
    this.state.elapsedTimerId = setInterval(() => {
      this.state.elapsedTime += 1
      this.updateWorkoutText()
    }, 1000)
  },

  finishTimedSet() {
    this.stopElapsedTimer()
    this.state.timerRunning = false
    this.state.reps = this.state.elapsedTime
    this.finishSet()
  },

  skipExercise() {
    if (this.state.mode !== 'workout' || this.state.pendingExercises.length < 2) return
    this.stopElapsedTimer()
    const currentPosition = this.state.pendingExercises.indexOf(this.state.exerciseIndex)
    if (currentPosition < 0) return
    const skipped = this.state.pendingExercises.splice(currentPosition, 1)[0]
    this.state.pendingExercises.push(skipped)
    this.state.exerciseIndex = this.state.pendingExercises[0]
    this.showCurrentSet()
  },

  finishSet() {
    if (this.state.mode !== 'workout') return
    if (this.isTimedExercise() && !this.state.timerRunning && this.state.elapsedTime === 0) return this.toggleTimedExercise()
    const exercise = this.state.routine.exercises[this.state.exerciseIndex]
    const completedExercise = this.state.completed.find((item) => item.exercise_template_id === exercise.exercise_template_id)
    const completedSet = { type: 'normal', weight_kg: this.state.weight, reps: this.state.reps }
    if (completedExercise) completedExercise.sets.push(completedSet)
    else this.state.completed.push({ exercise_template_id: exercise.exercise_template_id, sets: [completedSet] })
    this.state.exerciseSetProgress[this.state.exerciseIndex] = this.state.setIndex + 1
    const hasNextSet = this.state.setIndex + 1 < exercise.sets.length
    if (hasNextSet) {
      this.startRest(Number(exercise.rest_seconds || 60))
    } else {
      this.state.pendingExercises = this.state.pendingExercises.filter((index) => index !== this.state.exerciseIndex)
      if (this.state.pendingExercises.length) this.startRest(Number(exercise.rest_seconds || 60))
      else this.submitWorkout()
    }
  },

  startRest(seconds) {
    this.clearRestTimer()
    if (!seconds || seconds < 1) return this.advanceAfterRest()
    this.state.remainingRest = Math.round(seconds)
    this.setMode('rest')
    this.setPageBright()
    this.updateRestText()
    this.state.restTimerId = setInterval(() => {
      this.state.remainingRest -= 1
      if (this.state.remainingRest <= 0) {
        this.clearRestTimer()
        this.notifyRestFinished()
        this.advanceAfterRest()
      } else {
        this.updateRestText()
      }
    }, 1000)
  },

  updateRestText() {
    const minutes = Math.floor(this.state.remainingRest / 60)
    const seconds = this.state.remainingRest % 60
    const clock = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
    this.setText(this.state.routineText, 'DESCANSO')
    this.setText(this.state.status, clock)
    this.state.status.setProperty(prop.COLOR, this.state.remainingRest % 2 ? 0xffb52e : 0xffffff)
    this.setText(this.state.progress, 'O proximo set comeca ao terminar')
    this.setText(this.state.next, 'Botao inferior: pular descanso')
  },

  advanceAfterRest() {
    if (!this.state.pendingExercises.length) return this.submitWorkout()
    this.state.exerciseIndex = this.state.pendingExercises[0]
    this.state.setIndex = Number(this.state.exerciseSetProgress[this.state.exerciseIndex] || 0)
    this.setMode('workout')
    this.showCurrentSet()
  },

  skipRest() {
    if (this.state.mode !== 'rest') return
    this.clearRestTimer()
    this.advanceAfterRest()
  },

  setPageBright() {
    setPageBrightTime({ brightTime: 2147483000 })
  },

  clearRestTimer() {
    if (this.state.restTimerId) {
      clearInterval(this.state.restTimerId)
      this.state.restTimerId = null
    }
  },

  notifyRestFinished() {
    try {
      this.state.vibrator.start({ mode: VIBRATOR_SCENE_STRONG_REMINDER })
      this.state.vibrationTimerId = setTimeout(() => {
        try {
          this.state.vibrator.start({ mode: VIBRATOR_SCENE_NOTIFICATION })
        } catch (error) {}
      }, 900)
    } catch (error) {
      try {
        this.state.vibrator.setMode(VIBRATOR_SCENE_TIMER)
        this.state.vibrator.start()
      } catch (fallbackError) {}
    }
  },

  stopElapsedTimer() {
    if (this.state.elapsedTimerId) {
      clearInterval(this.state.elapsedTimerId)
      this.state.elapsedTimerId = null
    }
  },

  submitWorkout() {
    if (this.state.isSubmitting) return
    this.state.isSubmitting = true
    this.setMode('sending')
    this.setText(this.state.status, `Enviando treino...\nBPM medio: ${this.state.averageBpm || '--'}`)
    messageBuilder.request({ method: 'CREATE_WORKOUT', params: { workout: {
      title: this.state.routine.title,
      description: `BPM medio: ${this.state.averageBpm || '--'} | BPM maximo: ${this.state.maxBpm || '--'} | Esforco: ${this.effortLabel()}`,
      start_time: this.state.workoutStartedAt,
      end_time: new Date().toISOString(),
      is_private: false,
      exercises: this.state.completed
    } } }).then(({ result }) => {
      if (result?.error) throw new Error(result.error)
      this.state.isSubmitting = false
      this.setMode('done')
      resetPageBrightTime()
      this.setText(this.state.title, 'TREINO CONCLUIDO')
      this.setText(this.state.routineText, this.state.routine.title)
      this.setText(this.state.status, 'ENVIADO AO HEVY')
      this.setText(this.state.progress, `BPM medio ${this.state.averageBpm || '--'}  |  maximo ${this.state.maxBpm || '--'}`)
      this.setText(this.state.next, `Esforco: ${this.effortLabel()}  |  Nao aperte novamente`)
      try { this.state.vibrator.start({ mode: VIBRATOR_SCENE_NOTIFICATION }) } catch (error) {}
    }).catch((error) => {
      this.state.isSubmitting = false
      this.setMode('error')
      this.setText(this.state.status, `Falha ao enviar\nVerifique o Hevy antes de tentar novamente`)
      this.setText(this.state.progress, String(error.message || error))
    })
  },

  effortLabel() {
    const bpm = this.state.averageBpm
    if (!bpm) return 'sem dados'
    if (bpm >= 150) return 'alto'
    if (bpm >= 125) return 'moderado-alto'
    if (bpm >= 100) return 'moderado'
    return 'leve'
  },

  onDestroy() {
    this.clearRestTimer()
    this.stopElapsedTimer()
    if (this.state.vibrationTimerId) clearTimeout(this.state.vibrationTimerId)
    offKey()
    resetPageBrightTime()
    if (this.state.heartRate && this.state.hrListener) this.state.heartRate.offCurrentChange(this.state.hrListener)
  }
})
