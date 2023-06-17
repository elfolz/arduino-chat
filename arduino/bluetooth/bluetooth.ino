#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define BLE_SERVER_NAME "ChatDoAlém"
#define SERVICE_UUID "8452fb34-0d4c-11ee-be56-0242ac120002"
#define CHARACTERISTIC_UUID "8aaf51c6-0d4c-11ee-be56-0242ac120002"

int i = 0;
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
		Serial.println("BLE Start Advertising...");
		pServer->getAdvertising()->start();
	}
};

void setup() {
	Serial.println("BLE Starting...");
	Serial.begin(115200);
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

	Serial.println("BLE Starting...");
	pService->start();

	Serial.println("BLE Start Advertising...");
	BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
	pAdvertising->addServiceUUID(SERVICE_UUID);
	BLEDevice::startAdvertising();
	Serial.println("BLE Waiting for connection...");
}

void loop() {
	if (deviceConnected) {
		pCharacteristic->setValue("Lorem Ipsum Dolor");
		pCharacteristic->notify();
		Serial.println(i);
		i++;
		delay(2500);
	}
}