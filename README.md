# Rasskin data logger

Un data logger para Arduino, sin l�mite en el n�mero de streams.

Se espera que cada data stream sea un n�mero y este separado por espacios. El primer stream debe ser de tiempo en milisegundos. Al final de la l�nea es necesario mandar un \r.

Ejemplo:

'''
Serial.print(millis());
Serial.print(" ");
Serial.print(stream1);
Serial.print(" ");
Serial.print(stream2);
Serial.print(" ");
Serial.print(stream3);
Serial.print(" ");
Serial.print("\r");
'''