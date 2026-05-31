# Listen-Legenden

## Wolltest du dich schon immer mal wie Andi fühlen?

Dann hab ich jetzt endlich eine Web-App für dich!  
  
Eine Nachbildung von ***Wer bietet mehr?*** von [PietSmiet](https://www.youtube.com/@pietsmiet).

### Listen Legenden!

Steuere alles nötige in der Moderationsansicht, während sich deine Freunde an der schönen Spieleransicht vergnügen!


# NFO

Aktuell hat diese Web-App keine Online Funktion und ich bin mir nicht sicher ob sie jemals eine haben wird.  
Diese App ist eher dazu gedacht, sie über Discord zu streamen oder über OBS.Ninja/VDO.Ninja zu streamen.

Listen Legenden läuft Lokal auf eurem Rechner, ihr braucht kein Internet, abgesehen von der installation.  
Es wird nichts online gespeichert, alles ist auf eurem Gerät.  
Wenn ihr die *start.bat* Datei ausführt, öffnet sich eine Eingabeaufforderung, die muss offen bleiben!  
Die App nutzt den Port 3000, wenn der bei euch belegt ist, startet die App nicht.  
Die Runden bzw. Kategorien liegen als JSON Datei in /rounds.  
Spielstände werden lokal im /data Ordner gespeichert. Sitzungsübergreifend bleiben also alle Teams, Punkte, Fehler etc bestehen, bis ihr oben rechts auf "Neues Spiel" klickt.  
Aktuell gibt es keine Möglichkeit mehrere Spielstände gleichzeitig zu speichen oder zu laden. Wenn ihr das möchtet, macht ein manuelles Backup von der Datei.  

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

Dazu gibt es für den Moderator natürlich auch eine Moderationsansicht.  
Hier kann eigentlich alles eingestellt werden, was man so brauchen könnte unterteilt in Übersichtliche tabs.  

### Dashboard

Hier findet ihr eine Übersicht zur aktuell laufenden Runde und eine Kurzanleitung wie ihr dinge einstellt  
<img width="1914" height="920" alt="grafik" src="https://github.com/user-attachments/assets/c49fb983-e8d5-41ff-82b5-24d5da3bdbe1" />

### Teams

Hier könnt ihr Teams hinzufügen oder löschen, den Teams namen geben, Notieren wer in welchem Team spielt, den Punktestand manuell anpassen, das Gebot des Teams ändern und die Fehler notieren.  
<img width="1918" height="924" alt="grafik" src="https://github.com/user-attachments/assets/482b5951-a0a4-4d3d-b1fa-dd9cac436e9f" />

### Runden 
Auf der Linken Seite könnt ihr aussuchen welche Runde bzw welche Kategorie ihr spielen wollt.  
Sobald ihr eine Kategorie ladet, werden alle Einträge in der Liste für die Spieler verdeckt, also keine Angst vor spoilern.  
Ihr könnt hier auch nach euren Kategorien suchen. Gesucht wird nach Titel und Untertitel.  
Ich nutze die Untertitel Zeile gerne für Tags und wie groß die Liste ist.  
Auf der rechten Seite findet ihr den Runden-Editor, hier könnt ihr ganz einfach eure eigenen Runden erstellen oder bearbeiten.
  
Wichtig bei den Listeneinträgen ist, alles was nach dem | steht, gilt als Info und wird mit der Antwort zusammen aufgedeckt.  

<img width="1901" height="1078" alt="grafik" src="https://github.com/user-attachments/assets/ed887a1a-219f-4448-a766-a0983892aa91" />


### Aktuelle Runde

Hier seht ihr die Antworten zur aktuellen Runde. Per Klick auf einen Eintrag wird er für die Spieler sichtbar.
Wenn ihr im Tab "Teams" ein aktives Team gesetzt habt und ein Gebot eingetragen habt, zeigt euch die Abschluss-Automatik wie viele Punkte welches Team bekommt, wenn die Runde beendet wird.  
  
Links habt ihr noch die EInstellungen für den Timer. Ihr könnt auch Kommazahlen eingeben, falls ihr 2.5 Minuten nutzen wollt. Beim Reset oder Neuem Spiel springt der Timer immer auf 5 Minuten.

<img width="1902" height="1063" alt="grafik" src="https://github.com/user-attachments/assets/9db59d27-9852-4055-b21b-d7553fc136f9" />

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

# :motorway: :world_map: ROADMAP :motorway: :world_map:
## Auf dem Plan / Nahe Zukunft  
+ Import/Export von Runden/Kategorien  
+ Umstieg von Web-App auf Desktop-App  
+ Ändern der Spiele App in einen Launcher mit mehreren Spielshows  
+ Hinzufügen von Jeopardy  
+ Hinzufügen von Ordnungshüter  
+ Hinzufügen von Traitor Quiz  
+ Hinzufügen von Sloxicon Quiz  

## Etwas entfernte Zukunft
***Dadurch das ich für diese Spielshows eine Online Funktion brauche, damit die Spieler mit der SHow interagieren können***  
***(Chips setzen beim Poker, Buzzernutzung) wird sich das ganze wohl etwas weiter nach hinten verschieben***  
  
+ Hinzufügen von Onlineunterstützung für Buzzer/Interaktive Spielshows  
+ Hinzufügen von Wie passt das zusammen?   
+ Hinzufügen von Quiz Poker
+ Hinzufügen von einfachem Buzzerraum
