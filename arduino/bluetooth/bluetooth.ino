#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
 #include <iostream>

#define BLE_SERVER_NAME "Além Chat"
#define SERVICE_UUID "8452fb34-0d4c-11ee-be56-0242ac120002"
#define CHARACTERISTIC_UUID "8aaf51c6-0d4c-11ee-be56-0242ac120002"
#define PIN_LED 12
#define PIN_BUTTON 13
#define SIGNAL_LEN 250

unsigned long signal_len, t1, t2;
String code = "";
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
		Serial.println("\nBLE Start Advertising...");
		pServer->getAdvertising()->start();
	}
};

void setup() {
	Serial.begin(115200);

	pinMode(PIN_BUTTON, INPUT_PULLUP);
	pinMode(PIN_LED, OUTPUT);
	
	Serial.println("BLE Server Starting...");
	BLEDevice::init(BLE_SERVER_NAME);

	Serial.println("BLE Creating Server...");
	pServer = BLEDevice::createServer();
	pServer->setCallbacks(new HandleServerCallbacks());
	BLEService *pService = pServer->createService(SERVICE_UUID);

	Serial.println("BLE Creating Characteristic...");
	pCharacteristic = pService->createCharacteristic(
			CHARACTERISTIC_UUID,
			BLECharacteristic::PROPERTY_READ |
			BLECharacteristic::PROPERTY_WRITE |
			BLECharacteristic::PROPERTY_NOTIFY |
			BLECharacteristic::PROPERTY_INDICATE
	);
	pCharacteristic->addDescriptor(new BLE2902());

	Serial.println("BLE Service Starting...");
	pService->start();

	Serial.println("BLE Creating Advertising...");
	BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
	pAdvertising->addServiceUUID(SERVICE_UUID);
	BLEDevice::startAdvertising();
	Serial.println("BLE Waiting for connection...");
}

void loop() {
	NextDotDash:
	while (digitalRead(PIN_BUTTON) == HIGH) {}
	t1 = millis();
	digitalWrite(PIN_LED, HIGH);
	while (digitalRead(PIN_BUTTON) == LOW) {}
	t2 = millis();
	digitalWrite(PIN_LED, LOW);
	signal_len = t2 - t1;
	if (signal_len > 50) {
		code += readio();
	}
	while ((millis() - t2) < 500) {
		if (digitalRead(PIN_BUTTON) == LOW) {
			goto NextDotDash;
		}
	}
	convertor();
}

char readio() {
	if (signal_len < SIGNAL_LEN && signal_len > 50) {
		return '.';
	} else if (signal_len > SIGNAL_LEN) {
		return '-';
	}
}

void convertor() {
	static String letters[] = {
			".-", "-...", "-.-.", "-..", ".", "..-.", "--.", "....", "..",
			".---", "-.-", ".-..", "--", "-.", "---", ".--.", "--.-", ".-.",
			"...", "-", "..-", "...-", ".--", "-..-", "-.--", "--..", "E"
  };
  static std::string alphabet[] = {
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
  };
	int i = 0;
	if (code == ".-.-.-") {
		Serial.print(".");
		if (deviceConnected) {
			pCharacteristic->setValue(".");
			pCharacteristic->notify();
		}
	} else {
		while (letters[i] != "E") {
			if (letters[i] == code) {
        Serial.print(char('A' + i));
				if (deviceConnected) {
          pCharacteristic->setValue(alphabet[i]);
          pCharacteristic->notify();
        }
				break;
			}
			i++;
		}
	}
	code = "";
}