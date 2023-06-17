const bleServiceUUID = '8452fb34-0d4c-11ee-be56-0242ac120002'
const bleCharacteristicUUID = '8aaf51c6-0d4c-11ee-be56-0242ac120002'

const decoder = new TextDecoder()
var usbDevice
var bleDevice
var deviceInfo
var reader

navigator.serviceWorker?.register('service-worker.js').then(reg => {
	reg.addEventListener('updatefound', () => {
		let newWorker = reg.installing
		newWorker?.addEventListener('statechange', () => {
			console.log('Update Installed. Restarting...')
			if (newWorker.state == 'activated') location.reload(true)
		})
	})
})

function init() {
	waitForDevice()
	navigator.serial.getPorts()
	.then(response => {
		if (!response?.length) return
		connectToUSBDevice(response[0])
	})
	document.querySelector('#clear').onclick = () => {
		document.querySelector('main span').innerHTML = ''
	}
}

function waitForDevice() {
	document.querySelector('#connectUSB').onclick = () => {
		navigator.serial.requestPort()
		.then(async response => {
			try {
				await reader?.cancel()
				await reader?.releaseLock()
				await usbDevice?.close()
			} catch(e){}
			reader = undefined
			connectToUSBDevice(response)
		})
		.catch(e => {
			document.querySelector('#connectUSB').removeAttribute('disabled')
			alert('Falha ao conectar.')
			console.error(e)
		})
	}
	document.querySelector('#connectBLE').onclick = () => {
		navigator.bluetooth.requestDevice({
			filters: [{services: [bleServiceUUID]}],
			optionalServices: [bleServiceUUID]
		})
		.then(device => {
			connectToBLE(device)
		})
		.catch(e => {
			document.querySelector('#connectBLE').removeAttribute('disabled')
			alert('Falha ao conectar.')
			console.error(e)
		})
	}
}

function connectToUSBDevice(device) {
	usbDevice = device
	device.open({baudRate: 9600})
	.then(() => {
		deviceInfo = `${device.getInfo().usbVendorId}__${device.getInfo().usbProductId}`
		console.info(`Connected to ${deviceInfo}`)
		document.querySelector('#connectBLE').setAttribute('disabled', 'true')
		document.querySelector('#connectUSB').setAttribute('disabled', 'true')
		reader = device.readable.getReader()
		read()
	})
	.catch(e => {
		usbDevice?.forget()
		alert('Falha ao conectar.')
		console.error(e)
	})
}

function connectToBLE(device) {
	bleDevice = device
	device.gatt.connect(device)
	.then(server => {
		return server.getPrimaryService(bleServiceUUID)
		.then(service => {
			return service.getCharacteristic(bleCharacteristicUUID)
			.then(characteristic => {
				deviceInfo = `${device.name}-${device.id}`
				console.info(`Connected to ${deviceInfo}`)
				document.querySelector('#connectBLE').setAttribute('disabled', 'true')
				document.querySelector('#connectUSB').setAttribute('disabled', 'true')
				return characteristic.startNotifications()
				.then(() => {
					characteristic.addEventListener('characteristicvaluechanged', e => {
						writeText(e.target.value)
					})
				})
			})
		})
	})
	.catch(e => {
		alert('Falha ao conectar.')
		console.error(e)
	})
}

function read() {
	if (!reader) return
	requestAnimationFrame(read)
	reader.read()
	.then(response => {
		if (response.done) return reader.releaseLock()
		writeText(response.value)
	})
	.catch(e => {
		console.error(e)
	})
}

function writeText(data) {
	const text = decoder.decode(data)
	if (text) document.querySelector('main span').innerHTML += text
}

document.onreadystatechange = () => {
	if (document.readyState == 'complete') init()
}
window.onbeforeunload = async () => {
	await reader?.cancel()
	await reader?.releaseLock()
	await usbDevice?.close()
}