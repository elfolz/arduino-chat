/** 
 * This development uses board ESP32-WROOM
*/

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define BLE_SERVER_NAME "Além Chat"
#define SERVICE_UUID "8452fb34-0d4c-11ee-be56-0242ac120002"
#define CHARACTERISTIC_UUID "8aaf51c6-0d4c-11ee-be56-0242ac120002"
#define PIN_LED 22
#define PIN_BUTTON 23
#define PIN_A_SENSOR 21

unsigned long signal_len, t1, t2;
String code = "";
int sensorA = 1;
int oldSensorA = 1;
int button = 1;
int oldButton = 1;
bool deviceConnected = false;
BLEServer *pServer = NULL;
BLECharacteristic *pCharacteristic = NULL;

class HandleServerCallbacks : public BLEServerCallbacks {
	void onConnect(BLEServer *pServer) {
		deviceConnected = true;
	};
	void onDisconnect(BLEServer *pServer) {
		deviceConnected = false;
		delay(500);
		//Serial.println("\nBLE Start Advertising...");
		pServer->getAdvertising()->start();
	}
};

void setup() {
	pinMode(PIN_BUTTON, INPUT_PULLUP);
	pinMode(PIN_LED, OUTPUT);
	pinMode(PIN_A_SENSOR, INPUT);
	Serial.begin(115200);
	//Serial.println("BLE Server Starting...");
	BLEDevice::init(BLE_SERVER_NAME);
	//Serial.println("BLE Creating Server...");
	pServer = BLEDevice::createServer();
	pServer->setCallbacks(new HandleServerCallbacks());
	BLEService *pService = pServer->createService(SERVICE_UUID);
	//Serial.println("BLE Creating Characteristic...");
	pCharacteristic = pService->createCharacteristic(
			CHARACTERISTIC_UUID,
			BLECharacteristic::PROPERTY_READ |
			BLECharacteristic::PROPERTY_WRITE |
			BLECharacteristic::PROPERTY_NOTIFY |
			BLECharacteristic::PROPERTY_INDICATE
	);
	pCharacteristic->addDescriptor(new BLE2902());
	//Serial.println("BLE Service Starting...");
	pService->start();
	//Serial.println("BLE Creating Advertising...");
	BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
	pAdvertising->addServiceUUID(SERVICE_UUID);
	BLEDevice::startAdvertising();
	//Serial.println("BLE Waiting for connection...");
}

void loop() {
	refreshSensor();
	refreshMorse();
}

void refreshSensor() {
	sensorA = digitalRead(PIN_A_SENSOR);
	if (oldSensorA != sensorA) {
		digitalWrite(PIN_LED, !sensorA);
		if (!sensorA) {
			Serial.print("A");
			sendChar("A");
		}
		oldSensorA = sensorA;
	}
}

void refreshMorse() {
	button = digitalRead(PIN_BUTTON);
	if (oldButton != button) {
		digitalWrite(PIN_LED, !button);
		if (!button) {
			t1 = millis();
		} else {
			t2 = millis();
			signal_len = t2 - t1;
			if (signal_len >= 500) {
				code += "-";
			} else if (signal_len >= 50) {
				code += ".";
			}
		}
		oldButton = button;
	}
	if (t2 && (millis() - t2) >= 1000 && button && code) {
		convertor();
	}
}

void convertor() {
	static String letters[] = {
			".-", "-...", "-.-.", "-..", ".", "..-.", "--.", "....", "..",
			".---", "-.-", ".-..", "--", "-.", "---", ".--.", "--.-", ".-.",
			"...", "-", "..-", "...-", ".--", "-..-", "-.--", "--.."
	};
	static std::string alphabet[] = {
		"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
		"N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
	};
	if (code == ".-.-.-") {
		Serial.print(".");
		sendChar(".");
	} else {
		int i = 0;
		while (i < 27) {
			if (letters[i] == code) {
				Serial.print(char('A' + i));
				sendChar(alphabet[i]);
				break;
			}
			i++;
		}
	}
	code = "";
}

void sendChar(std::string str) {
	if (deviceConnected) {
		pCharacteristic->setValue(str);
		pCharacteristic->notify();
	}
}