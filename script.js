const decoder = new TextDecoder()
var usbDevice
var deviceInfo
var reader

function init() {
	waitForDevice()
	navigator.serial.getPorts()
	.then(response => {
		if (!response?.length) return
		usbDevice = response[0]
		deviceInfo = `${usbDevice.getInfo().usbVendorId}__${usbDevice.getInfo().usbProductId}`
		console.info(`Connected to ${deviceInfo}`)
		connectToDevice()
	})
	document.querySelector('#clear').onclick = () => {
		document.querySelector('pre').innerHTML = ''
	}
}

function waitForDevice() {
	document.querySelector('#connect').onclick = () => {
		navigator.serial.requestPort()
		.then(async response => {
			try {
				await reader?.cancel()
				await reader?.releaseLock()
				await usbDevice?.close()
			} catch(e){}
			reader = undefined
			usbDevice = response
			deviceInfo = `${usbDevice.getInfo().usbVendorId}__${usbDevice.getInfo().usbProductId}`
			console.info(`Connected to ${deviceInfo}`)
			connectToDevice()
		})
		.catch(e => {
			document.querySelector('#connect').removeAttribute('disabled')
			console.log(e)
		})
	}
}

function connectToDevice() {
	usbDevice.open({baudRate: 9600})
	.then(() => {
		document.querySelector('#connect').setAttribute('disabled', 'true')
		reader = usbDevice.readable.getReader()
		read()
	})
	.catch(e => {
		alert('Falha ao conectar.')
		console.log(e)
	})
}

function read() {
	if (!reader) return
	requestAnimationFrame(read)
	reader.read()
	.then(response => {
		if (response.done) return reader.releaseLock()
		const char = decoder.decode(response.value)
		document.querySelector('pre').innerHTML += char
	})
	.catch(e => {
		console.log(e)
	})
}

document.onreadystatechange = () => {
	if (document.readyState == 'complete') init()
}
window.onbeforeunload = async () => {
	await reader?.cancel()
	await reader?.releaseLock()
	await usbDevice?.close()
}