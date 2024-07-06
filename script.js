'use strict'

class Workout {
	date = new Date()
	id = String(Date.now())

	constructor(coords, distance, duration) {
		this.coords = coords // [latitude, longitude]
		this.distance = distance // in km
		this.duration = duration // in min
	}

	_setDescription() {
		const months = [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December',
		]

		this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
			months[this.date.getMonth()]
		} ${this.date.getDate()}`
	}
}

class Running extends Workout {
	type = 'running'

	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration)
		this.cadence = cadence
		this.calcPace()
		this._setDescription()
	}

	calcPace() {
		this.pace = this.duration / this.distance
		return this.pace
	}
}

class Cycling extends Workout {
	type = 'cycling'

	constructor(coords, distance, duration, elevationGain) {
		super(coords, distance, duration)
		this.elevationGain = elevationGain

		this.calcSpeed()
		this._setDescription()
	}

	calcSpeed() {
		this.speed = this.distance / (this.duration / 60)
		return this.speed
	}
}

//////////////////////////////////////
// APPLICATION ARCHITECTURE
//////////////////////////////////////

const form = document.querySelector('.form')
const containerWorkouts = document.querySelector('.workouts')
const inputType = document.querySelector('.form__input--type')
const inputDistance = document.querySelector('.form__input--distance')
const inputDuration = document.querySelector('.form__input--duration')
const inputCadence = document.querySelector('.form__input--cadence')
const inputElevation = document.querySelector('.form__input--elevation')

class App {
	#map
	#mapZoomLevel = 13
	#mapEvent
	#workouts = []

	constructor() {
		this._getPosition()
		this._getLocalStorage()

		form.addEventListener('submit', this._newWorkout.bind(this))
		inputType.addEventListener('change', this._toggleElevationField)
		containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this))
	}

	_getPosition() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				this._loadMap.bind(this),
				(error) => {
					alert('Cound not get your position')
					console.error(error.message)
				}
			)
		}
	}

	_loadMap(position) {
		const { latitude, longitude } = position.coords
		const coords = [latitude, longitude]

		this.#map = L.map('map').setView(coords, this.#mapZoomLevel)
		L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(this.#map)

		this.#map.on('click', this._showForm.bind(this))

		this.#workouts.forEach((workout) => {
			this._renderWorkoutMarker(workout)
		})
	}

	_showForm(event) {
		this.#mapEvent = event
		form.classList.remove('hidden')
		inputDistance.focus()
	}

	_hideForm() {
		// Очистить поля формы
		inputDistance.value = ''
		inputDuration.value = ''
		inputCadence.value = ''
		inputElevation.value = ''

		form.style.display = 'none'
		form.classList.add('hidden')
		setTimeout(() => {
			form.style.display = 'grid'
		}, 1000)
	}

	_toggleElevationField() {
		inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
		inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
	}

	_newWorkout(event) {
		const validInputs = function (...inputs) {
			return inputs.every((input) => Number.isFinite(input) && input > 0)
		}

		event.preventDefault()

		let workout

		// Получение координат
		const { lat: latitude, lng: longitude } = this.#mapEvent.latlng
		const coords = [latitude, longitude]

		// Получение данных из формы
		const type = inputType.value
		const distance = Number(inputDistance.value)
		const duration = Number(inputDuration.value)

		// Если running, то создать экземпляр Running
		if (type === 'running') {
			const cadence = Number(inputCadence.value)

			// Проверка данных на валидность
			if (!validInputs(distance, duration, cadence)) {
				return alert('Incorrect data!')
			}

			workout = new Running(coords, distance, duration, cadence)
		}

		// Если cycling, то создать экземпляр Cycling
		if (type === 'cycling') {
			const elevation = Number(inputElevation.value)

			// Проверка данных на валидность
			if (!validInputs(distance, duration, elevation)) {
				return alert('Incorrect data!')
			}

			workout = new Cycling(coords, distance, duration, elevation)
		}

		// Добавление экземпляра workout в список workouts
		this.#workouts.push(workout)

		// Рендер маркера
		this._renderWorkoutMarker(workout)

		// Рендер тренировки в списке
		this._renderWorkout(workout)

		// Скрыть форму
		this._hideForm()

		// Поместить тренировку в localStorage
		this._setLocalStorage()
	}

	_renderWorkoutMarker(workout) {
		L.marker(workout.coords)
			.addTo(this.#map)
			.bindPopup(
				L.popup({
					maxWidth: 250,
					minWidth: 100,
					autoClose: false,
					closeOnClick: false,
					className: `${workout.type}-popup`,
				})
			)
			.setPopupContent(
				`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
			)
			.openPopup()
	}

	_renderWorkout(workout) {
		let html = `
			<li class="workout workout--${workout.type}" data-id="${workout.id}">
				<h2 class="workout__title">${workout.description}</h2>
				<div class="workout__details">
					<span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
					<span class="workout__value">${workout.distance}</span>
					<span class="workout__unit">km</span>
				</div>
				<div class="workout__details">
					<span class="workout__icon">⏱</span>
					<span class="workout__value">${workout.duration}</span>
					<span class="workout__unit">min</span>
				</div>
		`

		if (workout.type === 'running') {
			html += `
					<div class="workout__details">
						<span class="workout__icon">⚡️</span>
						<span class="workout__value">${workout.pace.toFixed(1)}</span>
						<span class="workout__unit">min/km</span>
					</div>
					<div class="workout__details">
						<span class="workout__icon">🦶🏼</span>
						<span class="workout__value">${workout.cadence}</span>
						<span class="workout__unit">spm</span>
					</div>
				</li>
			`
		}

		if (workout.type === 'cycling') {
			html += `
					<div class="workout__details">
						<span class="workout__icon">⚡️</span>
						<span class="workout__value">${workout.speed.toFixed(1)}</span>
						<span class="workout__unit">km/h</span>
					</div>
					<div class="workout__details">
						<span class="workout__icon">⛰</span>
						<span class="workout__value">${workout.elevationGain}</span>
						<span class="workout__unit">m</span>
					</div>
				</li>
			`
		}

		form.insertAdjacentHTML('afterend', html)
	}

	_moveToWorkout(event) {
		const workoutElement = event.target.closest('.workout')

		if (!workoutElement) {
			return
		}

		const currentWorkout = this.#workouts.find((workout) => {
			return workout.id === workoutElement.dataset.id
		})

		this.#map.setView(currentWorkout.coords, this.#mapZoomLevel, {
			animate: true,
			pan: {
				duration: 1,
			},
		})
	}

	_setLocalStorage() {
		localStorage.setItem('workouts', JSON.stringify(this.#workouts))
	}

	_getLocalStorage() {
		const workouts = JSON.parse(localStorage.getItem('workouts'))

		if (!workouts) {
			return
		}

		this.#workouts = workouts

		this.#workouts.forEach((workout) => {
			this._renderWorkout(workout)
		})
	}

	reset() {
		localStorage.removeItem('workouts')
		location.reload()
	}
}

const app = new App()

location
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
	.reload()
