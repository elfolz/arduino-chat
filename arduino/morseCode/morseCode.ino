#include <SoftwareSerial.h>

#define PIN_LED 2
#define PIN_BUTTON 4
#define SIGNAL_LEN 250

unsigned long signal_len, t1, t2;
String code = "";

void setup() {
	Serial.begin(9600);
	pinMode(PIN_BUTTON, INPUT_PULLUP);
	pinMode(PIN_LED, OUTPUT);
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
			"...", "-", "..-", "...-", ".--", "-..-", "-.--", "--.."};
	if (code == ".-.-.-") {
		Serial.print(".");
	} else {
		int i = 0;
		while (i < 27) {
			if (letters[i] == code) {
				Serial.print(char('A' + i));
				break;
			}
			i++;
		}
	}
	code = "";
}