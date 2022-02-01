import argparse
import requests
from rpi_ws281x import PixelStrip, Color
from threading import Thread

# LED strip configuration:
LED_COUNT = 300        # Number of LED pixels.
LED_PIN = 18          # GPIO pin connected to the pixels (18 uses PWM!).
# LED_PIN = 10        # GPIO pin connected to the pixels (10 uses SPI /dev/spidev0.0).
LED_FREQ_HZ = 800000  # LED signal frequency in hertz (usually 800khz)
LED_DMA = 10          # DMA channel to use for generating signal (try 10)
LED_BRIGHTNESS = 20  # Set to 0 for darkest and 255 for brightest
LED_INVERT = False    # True to invert the signal (when using NPN transistor level shift)
LED_CHANNEL = 0       # set to '1' for GPIOs 13, 19, 41, 45 or 53

tempo = 1000
t = 30. / tempo;
mult = tempo/60.;

color = Color(255, 128, 0)

def update():
    global tempo
    global t
    global mult
    global color
    while True:
        try:
            r = requests.get('http://192.168.1.16:8888/tempo')
            parts = r.text.split()
            tempo = float(parts[0])
            r = int(parts[1])
            g = int(parts[2])
            b = int(parts[3])

            color = Color(r, g, b)

            if tempo != 0:
                t = 30. / tempo;
            mult = tempo/60.;

            print(tempo)
        except Error:
            pass


def setStripColor(strip, color):
    for i in range(strip.numPixels()):
        strip.setPixelColor(i, color)

# Main program logic follows:
if __name__ == '__main__':
    thread1 = Thread( target=update )
    thread1.start()

    strip = PixelStrip(LED_COUNT, LED_PIN, LED_FREQ_HZ, LED_DMA, LED_INVERT, LED_BRIGHTNESS, LED_CHANNEL)
    strip.begin()

    while True:
        setStripColor(strip, color)

        t1 = time.time()
        i = 0.
        while i <= 38:
            strip.setBrightness(int(i))
            strip.show()
            i += mult

        i = 38
        while i > 0:
            strip.setBrightness(int(i))
            strip.show()
            i -= mult


        time.sleep(max(t*2 - (time.time() - t1), 0))
