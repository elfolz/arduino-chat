const bleServiceUUID = '8452fb34-0d4c-11ee-be56-0242ac120002'
const bleCharacteristicUUID = '8aaf51c6-0d4c-11ee-be56-0242ac120002'
const decoder = new TextDecoder()
const usbBaudRate = 9600

var usbDevice
var bleDevice
var deviceInfo
var reader
var dialog
var buttonUSB
var buttonBLE

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
	if (/iphone|ipad|macos/i.test(navigator.userAgent)) return openDialog('Este App não funciona em dispositivos Apple 😥', true)
	waitForDevice()
	navigator.serial.getPorts()
	.then(response => {
		if (response?.length) connectUSBDevice(response[0])
	})
	document.querySelector('#clear').onclick = () => {
		document.querySelector('main span').innerHTML = ''
	}
	dialog.querySelector('section svg').onclick = () => {
		closeDialog()
	}
}

function waitForDevice() {
	buttonUSB.onclick = () => {
		navigator.serial.requestPort()
		.then(async response => {
			disconnectUSBDevice()
			connectUSBDevice(response)
		})
		.catch(e => {
			buttonUSB.removeAttribute('disabled')
			openDialog('Falha ao conectar')
			console.error(e)
		})
	}
	buttonBLE.onclick = () => {
		navigator.bluetooth.requestDevice({
			filters: [{services: [bleServiceUUID]}],
			optionalServices: [bleServiceUUID]
		})
		.then(device => {
			connectBLEDevice(device)
		})
		.catch(e => {
			buttonBLE.removeAttribute('disabled')
			openDialog('Falha ao conectar')
			console.error(e)
		})
	}
}

function connectUSBDevice(device) {
	usbDevice = device
	device.open({baudRate: usbBaudRate})
	.then(() => {
		deviceInfo = `${device.getInfo().usbVendorId}__${device.getInfo().usbProductId}`
		console.info(`Connected to ${deviceInfo}`)
		disconnectAll()
		reader = device.readable.getReader()
		read()
	})
	.catch(e => {
		usbDevice?.forget()
		openDialog('Falha ao conectar')
		console.error(e)
	})
}

async function disconnectUSBDevice() {
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
			openDialog('Bluetooth desconectado')
			buttonBLE.removeAttribute('disabled')
		})
		return server.getPrimaryService(bleServiceUUID)
		.then(service => {
			return service.getCharacteristic(bleCharacteristicUUID)
			.then(characteristic => {
				deviceInfo = `${device.name}__${device.id}`
				console.info(`Connected to ${deviceInfo}`)
				disconnectAll()
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
		openDialog('Falha ao conectar')
		console.error(e)
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
		openDialog('Falha ao ler dados')
		disconnectUSBDevice()
		disconnectAll()
		console.error(e)
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

function disconnectAll() {
	buttonBLE.setAttribute('disabled', 'true')
	buttonUSB.setAttribute('disabled', 'true')
}

document.onreadystatechange = () => {
	if (document.readyState == 'complete') init()
}
window.onbeforeunload = async () => disconnectUSBDevice()