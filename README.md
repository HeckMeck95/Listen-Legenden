# Listen-Legenden

## Wolltest du dich schon immer mal wie Andi fühlen?

Dann hab ich jetzt endlich eine Web-App für dich!  
  
Eine Nachbildung von ***Wer bietet mehr?*** von [PietSmiet](https://www.youtube.com/@pietsmiet).

### Listen Legenden!

Steuere alles nötige in der Moderationsansicht, während sich deine Freunde an der schönen Spieleransicht vergnügen!

# :information_source:NFO

Aktuell hat diese Web-App keine Online Funktion und ich bin mir nicht sicher ob sie jemals eine haben wird.  
Diese App ist eher dazu gedacht, sie über Discord zu streamen oder über OBS.Ninja/VDO.Ninja zu streamen.
  
:warning::construction::warning:  
Listen Legenden läuft Lokal auf eurem Rechner, ihr braucht kein Internet, abgesehen von der installation.  
Es wird nichts online gespeichert, alles ist auf eurem Gerät.  
Wenn ihr die *start.bat* Datei ausführt, öffnet sich eine Eingabeaufforderung, die muss offen bleiben!  
Die App nutzt den Port 3000, wenn der bei euch belegt ist, startet die App nicht.  
Die Runden bzw. Kategorien liegen als JSON Datei in /rounds.  
Spielstände, Favoriten und Einstellungen werden lokal im /data Ordner gespeichert.  
:warning::construction::warning:  

## Spieleransicht

Es gibt eine Spieleransicht auf der alle wichtigen Infos für die Spieler stehen:  
Oben die Kategorie der Runde.  
In der Mitte die nummerierte Liste inklusive kleinem Timer  
Unten die Teams, Punkte, Fehler, Gebot und welches Team gerade aktiv die Runde spielt.  

<img width="1916" height="1078" alt="grafik" src="https://github.com/user-attachments/assets/ff0a84ce-1c8c-4a3f-a978-5f56d1233445" />
<img width="1920" height="1080" alt="grafik" src="https://github.com/user-attachments/assets/6b78ff51-d5a3-48cd-9c5c-28fa9ef706e2" />
<img width="1920" height="1078" alt="grafik" src="https://github.com/user-attachments/assets/82f189dc-4b70-4091-9518-a5003c21d659" />
<img width="1920" height="1078" alt="grafik" src="https://github.com/user-attachments/assets/8f90c01e-c184-410b-8f85-001b7b5e1fc1" />

## Moderatoransicht

Dazu gibt es für den Moderator natürlich auch ein eigenes Fenster.  
Hier kann eigentlich alles eingestellt werden, was man so brauchen könnte unterteilt in Übersichtliche tabs.  

### Dashboard

Hier findet ihr eine Übersicht zur aktuell laufenden Runde und eine Kurzanleitung wie ihr dinge einstellt  

<img width="1920" height="1080" alt="grafik" src="https://github.com/user-attachments/assets/2f90a5ff-ae73-4415-ac7c-bfbe54296b8a" />


### Teams

Hier könnt ihr Teams hinzufügen oder löschen, den Teams namen geben, eine Farbe zuordnen, Notieren wer in welchem Team spielt,  
den Punktestand manuell anpassen, das Gebot des Teams ändern und die Fehler notieren.  

<img width="1920" height="1080" alt="grafik" src="https://github.com/user-attachments/assets/7f377fba-9bca-4e37-9805-0cfeb6034157" />

### Runden  

Auf der Linken Seite könnt ihr aussuchen welche Runde bzw. welche Kategorie ihr spielen wollt.  
Sobald ihr eine Kategorie ladet, werden alle Einträge in der Liste für die Spieler verdeckt, also keine Angst vor spoilern.  
Ihr könnt hier auch nach euren Kategorien suchen. Gesucht wird nach Titel und Tags.  
Ihr könnt pro Runde maximal 5 Tags setzen mit einer Gesamtlänge von 20 Zeichen.  
Hier könnt ihr ebenfalls Runden favorisieren, diese werden unabhänig von eurem Spielstand gespeichert.  

Auf der rechten Seite findet ihr den Runden-Editor, hier könnt ihr ganz einfach eure eigenen Runden erstellen oder bearbeiten.  
Wichtig bei den Listeneinträgen ist, alles was nach dem | steht, gilt als Info und wird mit der Antwort zusammen aufgedeckt.  

<img width="1920" height="1080" alt="grafik" src="https://github.com/user-attachments/assets/e328f3f2-099b-486d-8211-f2f950d5f0bd" />


### Aktuelle Runde

Hier seht ihr die Antworten zur aktuellen Runde. Per Klick auf einen Eintrag wird er für die Spieler sichtbar.
Wenn ihr im Tab "Teams" ein aktives Team gesetzt habt und ein Gebot eingetragen habt, zeigt euch die Abschluss-Automatik wie viele Punkte welches Team bekommt, wenn die Runde beendet wird.  
  
Links habt ihr noch die Einstellungen für den Timer. Ihr könnt auch Kommazahlen eingeben, falls ihr 2.5 Minuten nutzen wollt. Beim Reset oder Neuem Spiel springt der Timer immer auf 5 Minuten.

<img width="1920" height="1078" alt="grafik" src="https://github.com/user-attachments/assets/bfe8d126-09f3-461b-bed1-9c8439d70b57" />


### Spielstände

Hier lassen sich ganz einfach Spielstände speichern und laden.  
Ihr könnt also mit meheren Gruppen spielen, oder euch als Moderatoren abwechseln, ohne euren Fortschritt zu verlieren.  
Die Spielstände liegen im data/saves/ Ordner.

<img width="1920" height="1079" alt="grafik" src="https://github.com/user-attachments/assets/f59e8663-d65e-40c4-b8e3-eac43cbdce1d" />

### Verlauf

In diesem Tab könnt ihr die Punktevergabe der letzten 20 Runden sehen.  
Falls also am Tisch mal wieder diskutiert wird, woher das andere Team 1 Punkt mehr hat, schaut hier nach.

<img width="1920" height="1080" alt="grafik" src="https://github.com/user-attachments/assets/2aa0d5d4-5d58-47f9-9614-d6af0fd7e0a1" />

### Einstellungen

Aktuell gibt es hier noch nicht viel zu sehen. Ihr könnt ein paar Hotkeys anpassen.
Später könnt ihr hier noch verschiedene Regeln einstellen, die Menge der Punkte ändern, UI Skalierung, alles was eben so dazu gehört.

<img width="1920" height="1080" alt="grafik" src="https://github.com/user-attachments/assets/850ff668-f75e-4ebc-9d89-1a78760f8f9f" />

# INSTALLATION

## Voraussetzung

Installiere [Node.js](https://nodejs.org/en)  

## Windows Schnellstart

1. Lade den latest release von Listen Legenden runter  
2. Schmeiß den Ordner irgendwo hin  
3. Doppelklick auf `install.bat`
4. Doppelklick auf `start.bat`
5. Die Moderator- und Spieleransicht öffnen sich automatisch in deinem Standardbrowser.

## Manueller Start

Alternativ kann die App auch über die Konsole gestartet werden:  
  
`nmp install`  
`npm start`  
Danach im Browser auf  
http://localhost:3000/moderator.html  
http://localhost:3000/player.html  

#  :motorway: :world_map: ROADMAP :motorway: :world_map:

## Auf dem Plan / Nahe Zukunft  

+ Designanpassungen und Layoutänderungen
+ Import/Export von Runden/Kategorien  
+ Umstieg von Web-App auf Desktop-App  
+ Ändern der Spiele App in einen Launcher mit mehreren Spielshows  
+ Hinzufügen von Jeopardy  
+ Hinzufügen von Ordnungshüter  
+ Hinzufügen von Traitor Quiz  
+ Hinzufügen von Sloxicon Quiz  

## Etwas entfernte Zukunft

***Dadurch das ich für diese Spielshows eine Online Funktion brauche, damit die Spieler mit der Show interagieren können***  
***(Chips setzen beim Poker, Buzzernutzung) wird sich das ganze wohl etwas weiter nach hinten verschieben***  
  
+ Hinzufügen von Onlineunterstützung für Buzzer/Interaktive Spielshows  
+ Hinzufügen von Wie passt das zusammen?  
+ Hinzufügen von Quiz Poker
+ Hinzufügen von einfachem Buzzerraum
