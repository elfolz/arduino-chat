const bleServiceUUID = '8452fb34-0d4c-11ee-be56-0242ac120002'
const bleCharacteristicUUID = '8aaf51c6-0d4c-11ee-be56-0242ac120002'
const decoder = new TextDecoder()
const usbBaudRate = 115200

var usbDevice
var bleDevice
var deviceInfo
var reader
var dialog
var buttonUSB
var buttonBLE
var i18n

if (location.protocol.startsWith('https')) {
	navigator.serviceWorker?.register('./service-worker.js').then(reg => {
		reg.addEventListener('updatefound', () => {
			let newWorker = reg.installing
			newWorker?.addEventListener('statechange', () => {
				console.log('Update Installed. Restarting...')
				if (newWorker.state == 'activated') location.reload(true)
			})
		})
	})
}

function init() {
	dialog = document.querySelector('dialog')
	buttonUSB = document.querySelector('#connectUSB')
	buttonBLE = document.querySelector('#connectBLE')
	if (!'serial' in navigator && !'bluetooth' in navigator) {
		return openDialog(i18n['incompatibleDevice'], true)
	}
	if (!'serial' in navigator) buttonUSB.style.setProperty('display', 'none')
	if (!'bluetooth' in navigator) buttonBLE.style.setProperty('display', 'none')
	waitForDevice()
	/* navigator.serial.getPorts()
	.then(response => {
		if (response?.length) connectSerialDevice(response[0])
	}) */
	document.querySelector('#clear').onclick = () => {
		document.querySelector('main span').innerHTML = ''
	}
	dialog.querySelector('section svg').onclick = () => {
		closeDialog()
	}
}

function waitForDevice() {
	buttonUSB.onclick = () => {
		navigator.serial.requestPort({
			filters: [{usbVendorId: 0x10C4}]
		})
		.then(device => {
			disconnectSerialDevice()
			if (device) connectSerialDevice(device)
		})
		.catch(e => {
			buttonUSB.removeAttribute('disabled')
			openDialog(i18n['connectionFailed'])
			console.error(e)
		})
	}
	buttonBLE.onclick = () => {
		navigator.bluetooth.requestDevice({
			filters: [{services: [bleServiceUUID]}]
		})
		.then(device => {
			if (device) connectBLEDevice(device)
		})
		.catch(e => {
			buttonBLE.removeAttribute('disabled')
			openDialog(i18n['connectionFailed'])
			console.error(e)
		})
	}
}

function connectSerialDevice(device) {
	usbDevice = device
	device.open({baudRate: usbBaudRate})
	.then(() => {
		deviceInfo = `${device.getInfo().usbVendorId}__${device.getInfo().usbProductId}`
		console.info(`Connected to ${deviceInfo}`)
		disableAll()
		reader = device.readable.getReader()
		read()
	})
	.catch(e => {
		usbDevice?.forget()
		openDialog(i18n['connectionFailed'])
		console.error(e)
	})
}

async function disconnectSerialDevice() {
	try {
		await reader?.cancel()
		await reader?.releaseLock()
		await usbDevice?.close()
	} catch(e){}
	reader = undefined
}

function connectBLEDevice(device) {
	bleDevice = device
	device.gatt.connect(device)
	.then(server => {
		device.addEventListener('gattserverdisconnected', () => {
			openDialog(i18n['bluetoothDisconnected'])
			buttonBLE.removeAttribute('disabled')
		})
		return server.getPrimaryService(bleServiceUUID)
		.then(service => {
			return service.getCharacteristic(bleCharacteristicUUID)
			.then(characteristic => {
				deviceInfo = device.id
				console.info(`Connected to ${deviceInfo}`)
				disableAll()
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
		console.error(e)
		openDialog(i18n['connectionFailed'])
		enableAll()
	})
}

function read() {
	if (!reader) return
	reader.read()
	.then(response => {
		if (response.done) return reader.releaseLock()
		writeText(response.value)
		requestAnimationFrame(read)
	})
	.catch(e => {
		console.error(e)
		openDialog(i18n['readDataFailed'])
		disconnectSerialDevice()
		enableAll()
	})
}

function writeText(data) {
	const text = decoder.decode(data)
	if (text?.length == 1) document.querySelector('main span').innerHTML += text
}

function openDialog(text, disableClose=false) {
	dialog.querySelector('section span').innerHTML = text
	if (disableClose) dialog.querySelector('section svg').style.setProperty('display', 'none')
	else dialog.querySelector('section svg').style.removeProperty('display')
	dialog.classList.add('open')
	try { navigator.vibrate(100) } catch(e) {}
}

function closeDialog() {
	dialog.classList.add('close')
	setTimeout(() => {
		dialog.classList.remove('open')
		dialog.classList.remove('close')
	}, 300)
}

function enableAll() {
	buttonBLE.removeAttribute('disabled')
	buttonUSB.removeAttribute('disabled')
}

function disableAll() {
	buttonBLE.setAttribute('disabled', 'true')
	buttonUSB.setAttribute('disabled', 'true')
}

function translate(lang) {
	fetch(`./i18n/${lang}.json`)
	.then(response => {
		return response.json()
	})
	.then(json => {
		i18n = json
		document.querySelectorAll('[i18n]')?.forEach(el => {
			el.innerHTML = json[el.attributes.i18n.value]
		})
	})
	.catch(e => {
		console.error(e)
		translate('en')
	})
}

document.onreadystatechange = () => {
	if (document.readyState != 'complete') return
	const lang = navigator.language?.split('-')
	translate(lang ? lang[0] : 'en')
	init()
}
window.onbeforeunload = async () => disconnectSerialDevice()